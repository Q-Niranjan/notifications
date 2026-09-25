import { describe, expect, it } from "vitest";
import { connectionKey } from "@/shared/utils/connectionKey";

describe("connectionKey", () => {
  it("joins connection fields and serializes context", () => {
    expect(
      connectionKey({
        subscriberId: "user-1",
        applicationIdentifier: "app-1",
        subscriberHash: "hash",
        backendUrl: "https://api.example.com",
        socketUrl: "wss://ws.example.com",
        contextHash: "ctx",
        context: {
          b: 2,
          a: "acme",
          nested: { id: "org-1", data: { z: true, a: [1, null] } },
        },
      })
    ).toBe(
      "user-1|app-1|hash|https://api.example.com|wss://ws.example.com|ctx|{a:acme,b:2,nested:{data:{a:[1,],z:true},id:org-1}}|"
    );
  });

  it("treats missing fields as empty", () => {
    expect(
      connectionKey({ subscriberId: undefined as unknown as string })
    ).toBe("|||||||");
  });
});
