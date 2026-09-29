import {
  getNextProductionStep,
  getPreviousProductionStep,
  getProductionTeamLabel,
} from "./productionSteps";

test("finds the next team after skipping consecutive teams", () => {
  expect(
    getNextProductionStep("phoi", ["dinhHinh", "lapRap"]),
  ).toBe("nham");
  expect(getProductionTeamLabel("nham")).toBe("Tổ Trà Nhám");
});

test("finds the previous active team when intermediate teams are skipped", () => {
  expect(
    getPreviousProductionStep("lapRap", ["dinhHinh"]),
  ).toBe("phoi");
});

test("returns no next team after packaging", () => {
  expect(getNextProductionStep("dongGoi")).toBeNull();
});
