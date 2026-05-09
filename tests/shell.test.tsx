import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LeftRail } from "../src/components/LeftRail";

test("LeftRail renders three labelled destinations", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LeftRail />
    </MemoryRouter>
  );
  expect(screen.getByLabelText(/browse/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/library/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/settings/i)).toBeInTheDocument();
});
