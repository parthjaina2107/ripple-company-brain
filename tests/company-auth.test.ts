import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuth } from "../server/auth.js";
import { randomUUID } from "node:crypto";

test("real sessions protect organizations: signup, wrong password, cross-company selection and logout", async () => {
  const { auth, close } = await createAuth({ file: ":memory:", secret: "isolated-test-secret-for-authentication-32-plus", baseURL: "http://localhost:3001" });
  const send = (path: string, body?: unknown, cookie?: string) => auth.handler(new Request(`http://localhost:3001/api/auth/${path}`, { method: body ? "POST" : "GET", headers: { origin: "http://localhost:3001", ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }));
  const cookieFrom = (response: Response) => response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  try {
    assert.equal(await auth.api.getSession({ headers: new Headers() }), null);
    const password = `test-only-${randomUUID()}`;
    const a = await send("sign-up/email", { email: "owner-a@example.test", password, name: "Test owner A" });
    assert.equal(a.status, 200); const cookieA = cookieFrom(a); assert.ok(cookieA);
    const sessionA = await auth.api.getSession({ headers: new Headers({ cookie: cookieA }) }); assert.ok(sessionA);
    const orgA = await send("organization/create", { name: "Test company A", slug: "test-company-a", metadata: { website: "https://example.com" } }, cookieA);
    assert.equal(orgA.status, 200); const companyA = await orgA.json();
    const memberA = await auth.api.getActiveMember({ headers: new Headers({ cookie: cookieA }) });
    assert.equal(memberA.organizationId, companyA.id);
    assert.equal(memberA.role, "owner");
    const b = await send("sign-up/email", { email: "owner-b@example.test", password, name: "Test owner B" });
    assert.equal(b.status, 200); const cookieB = cookieFrom(b);
    const denied = await send("organization/set-active", { organizationId: companyA.id }, cookieB);
    assert.ok([400, 403, 404].includes(denied.status), "A non-member must not be able to activate another company's workspace");
    const listed = await auth.api.listOrganizations({ headers: new Headers({ cookie: cookieB }) }); assert.equal(listed.length, 0);
    const wrong = await send("sign-in/email", { email: "owner-a@example.test", password: "not-the-correct-password" }); assert.equal(wrong.status, 401);
    const foreignOrigin = await auth.handler(new Request("http://localhost:3001/api/auth/sign-out", { method: "POST", headers: { origin: "https://untrusted.example", cookie: cookieA, "content-type": "application/json" }, body: "{}" }));
    assert.equal(foreignOrigin.status, 403);
    const loggedOut = await send("sign-out", {}, cookieA); assert.equal(loggedOut.status, 200);
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: cookieA }) }), null);
  } finally { close(); }
});
