import { redactSensitiveQuery, redactUrl } from "./log-redaction.util";

describe("log-redaction.util", () => {
  describe("redactUrl", () => {
    it("preserves URLs without query params", () => {
      expect(redactUrl("/api/v1/health/ready")).toBe("/api/v1/health/ready");
    });

    it("redacts sensitive query values (URL-encoded)", () => {
      expect(redactUrl("/api/v1/push/unsubscribe?endpoint=wss://secret")).toBe(
        "/api/v1/push/unsubscribe?endpoint=%5BREDACTED%5D",
      );
      expect(redactUrl("/api/v1/auth/refresh?token=abc123")).toBe(
        "/api/v1/auth/refresh?token=%5BREDACTED%5D",
      );
    });

    it("preserves non-sensitive query params", () => {
      expect(redactUrl("/api/v1/students?limit=20&page=1")).toBe(
        "/api/v1/students?limit=20&page=1",
      );
    });

    it("handles multiple sensitive params", () => {
      expect(redactUrl("/api?token=abc&password=secret&endpoint=wss://x")).toBe(
        "/api?token=%5BREDACTED%5D&password=%5BREDACTED%5D&endpoint=%5BREDACTED%5D",
      );
    });

    it("handles malformed URLs gracefully", () => {
      expect(redactUrl("not a url")).toBe("not a url");
    });
  });

  describe("redactSensitiveQuery", () => {
    it("redacts sensitive keys in query strings", () => {
      expect(redactSensitiveQuery("?endpoint=wss://secret.example")).toBe(
        "?endpoint=[REDACTED]",
      );
      expect(redactSensitiveQuery("?token=abc123")).toBe("?token=[REDACTED]");
    });

    it("preserves non-sensitive content", () => {
      const msg = "?limit=20&page=1";
      expect(redactSensitiveQuery(msg)).toBe(msg);
    });

    it("redacts multiple sensitive params", () => {
      expect(redactSensitiveQuery("?token=abc&password=xyz")).toBe(
        "?token=[REDACTED]&password=[REDACTED]",
      );
    });
  });
});
