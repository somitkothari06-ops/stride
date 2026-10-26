// No provider credentials or paid model calls: validates readiness and failure paths.
import assert from "node:assert/strict";
const base = process.env.STRIDE_BASE_URL || "http://127.0.0.1:3100";
const options = await fetch(base+"/api/account/oauth").then(r=>r.json());
assert.equal(typeof options.google,"boolean"); assert.equal(typeof options.github,"boolean");
for (const provider of ["google","github"]) {
  if (!options[provider] && options.available) {
    const response = await fetch(base+"/api/account/oauth",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({provider})});
    assert.equal(response.status,503);
    assert.equal((await response.json()).error.code,"OAUTH_NOT_CONFIGURED");
    assert.equal(response.headers.has("set-cookie"),false);
  }
}
const crossOrigin = await fetch(base+"/api/account/oauth",{method:"POST",headers:{Origin:"https://unrelated.example","Content-Type":"application/json"},body:JSON.stringify({provider:"google"})});
assert.equal(crossOrigin.status,403);
const callback = await fetch(base+"/api/account/oauth/callback?code=synthetic-invalid-code&next=https://unrelated.example",{redirect:"manual"});
assert.equal(callback.status,303);
assert.equal(callback.headers.get("location"),base+"/login?oauth_error=retry");
assert.equal(callback.headers.get("referrer-policy"),"no-referrer");
assert.equal(callback.headers.get("cache-control"),"no-store");
assert(!callback.headers.get("set-cookie")?.includes("stride_account="));
console.log(`OAuth readiness/failure checks passed. Google enabled: ${options.google}; GitHub enabled: ${options.github}. This does not verify provider consent or a successful login.`);
