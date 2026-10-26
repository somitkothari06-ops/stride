import test from "node:test";
import assert from "node:assert/strict";
import { authOrigin } from "../lib/auth-origin";
test("auth redirects use an allowed browser host rather than the internal listen address", () => {
  assert.equal(authOrigin(new Request("http://0.0.0.0:3000/callback",{headers:{host:"127.0.0.1:3100"}})),"http://127.0.0.1:3100");
  assert.equal(authOrigin(new Request("http://0.0.0.0:3000/start",{headers:{origin:"http://localhost:3100"}})),"http://localhost:3100");
  assert.throws(()=>authOrigin(new Request("http://0.0.0.0:3000/callback",{headers:{host:"attacker.example"}})),/FORBIDDEN/);
  assert.throws(()=>authOrigin(new Request("http://0.0.0.0:3000/start",{headers:{origin:"https://attacker.example"}})),/FORBIDDEN/);
});
test("a pinned public origin preserves HTTPS through the proxy and refuses unlisted hosts", () => {
  process.env.STRIDE_PUBLIC_ORIGIN="https://stride.example";
  try {
    assert.equal(authOrigin(new Request("http://0.0.0.0:3000/callback",{headers:{"x-forwarded-host":"stride.example"}})),"https://stride.example");
    assert.throws(()=>authOrigin(new Request("http://0.0.0.0:3000/callback",{headers:{"x-forwarded-host":"attacker.example"}})),/FORBIDDEN/);
    assert.throws(()=>authOrigin(new Request("http://127.0.0.1:3100/start",{headers:{origin:"http://127.0.0.1:3100"}})),/FORBIDDEN/);
  } finally { delete process.env.STRIDE_PUBLIC_ORIGIN; }
});
