import { loginAccount, logoutAccount, getCurrentStudent, verifyCurrentStudent } from "@/lib/auth";

describe("auth module", () => {
  beforeEach(() => {
    logoutAccount();
  });

  it("loginAccount succeeds with correct credentials", () => {
    const result = loginAccount("20210001", "Nguyen Van An");
    expect(result.ok).toBe(true);
  });

  it("loginAccount fails with wrong name", () => {
    const result = loginAccount("20210001", "Wrong Name");
    expect(result.ok).toBe(false);
  });

  it("loginAccount fails with unknown id", () => {
    const result = loginAccount("UNKNOWN", "Anyone");
    expect(result.ok).toBe(false);
  });

  it("getCurrentStudent returns null before login", () => {
    expect(getCurrentStudent()).toBeNull();
  });

  it("getCurrentStudent returns student after login", () => {
    loginAccount("20210001", "Nguyen Van An");
    const student = getCurrentStudent();
    expect(student?.id).toBe("20210001");
  });

  it("verifyCurrentStudent returns valid after login", () => {
    loginAccount("20210001", "Nguyen Van An");
    const result = verifyCurrentStudent();
    expect(result.ok).toBe(true);
  });

  it("logoutAccount clears session", () => {
    loginAccount("20210001", "Nguyen Van An");
    logoutAccount();
    expect(getCurrentStudent()).toBeNull();
  });
});
