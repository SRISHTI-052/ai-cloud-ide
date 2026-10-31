// Test helper: installs a fake `fetch` that emulates the backend API in memory.
// Not imported by app code, so it never ends up in the production bundle.

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

export function mockBackend({ files, ai } = {}) {
  const store = {
    "App.js": "// App.js content",
    "index.js": "// index.js content",
    ...files,
  };

  const fetchMock = jest.fn((url, options = {}) => {
    const { pathname } = new URL(url);
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : {};

    if (pathname === "/files" && method === "GET") return json(Object.keys(store));
    if (pathname === "/files" && method === "POST") {
      if (body.filename in store) return json({ detail: "File already exists" }, 400);
      store[body.filename] = body.content;
      return json({ message: "created" });
    }
    const fileMatch = pathname.match(/^\/files\/(.+)$/);
    if (fileMatch) {
      const name = decodeURIComponent(fileMatch[1]);
      if (!(name in store)) return json({ detail: "File not found" }, 404);
      if (method === "GET") return json({ filename: name, content: store[name] });
      if (method === "PUT") {
        store[name] = body.content;
        return json({ message: "updated" });
      }
    }
    if (ai && ai[pathname]) {
      const { status = 200, body: resBody } = ai[pathname](body);
      return json(resBody, status);
    }
    return json({ detail: `Unhandled ${method} ${pathname}` }, 500);
  });

  global.fetch = fetchMock;
  return { fetchMock, store };
}

// All calls made with the given method to paths starting with `prefix`.
export const callsTo = (fetchMock, method, prefix) =>
  fetchMock.mock.calls.filter(
    ([url, opts = {}]) =>
      (opts.method || "GET") === method && new URL(url).pathname.startsWith(prefix)
  );
