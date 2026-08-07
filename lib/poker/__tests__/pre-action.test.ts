import assert from "node:assert/strict";
import { resolvePreAction, type PreAction } from "../pre-action";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

run("checkFold: free → check, facing bet → fold", () => {
  const pre: PreAction = { kind: "checkFold" };
  assert.deepEqual(resolvePreAction(pre, { toCall: 0, stack: 500 }), {
    type: "check",
  });
  assert.deepEqual(resolvePreAction(pre, { toCall: 40, stack: 500 }), {
    type: "fold",
  });
});

run("call lock cancels if amount rises", () => {
  const pre: PreAction = { kind: "call", maxCall: 40 };
  assert.equal(resolvePreAction(pre, { toCall: 80, stack: 500 }), null);
  assert.deepEqual(resolvePreAction(pre, { toCall: 40, stack: 500 }), {
    type: "call",
  });
  assert.deepEqual(resolvePreAction(pre, { toCall: 0, stack: 500 }), {
    type: "check",
  });
});

run("callAny calls or all-in", () => {
  const pre: PreAction = { kind: "callAny" };
  assert.deepEqual(resolvePreAction(pre, { toCall: 0, stack: 500 }), {
    type: "check",
  });
  assert.deepEqual(resolvePreAction(pre, { toCall: 40, stack: 500 }), {
    type: "call",
  });
  assert.deepEqual(resolvePreAction(pre, { toCall: 600, stack: 500 }), {
    type: "all-in",
  });
});

console.log("pre-action tests done");
