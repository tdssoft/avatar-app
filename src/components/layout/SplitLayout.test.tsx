import React from "react";
import { render } from "@testing-library/react";

import SplitLayout from "./SplitLayout";

describe("SplitLayout", () => {
  it("renders the auth content before the visual panel when media is positioned on the right", () => {
    const { container } = render(
      <SplitLayout
        mediaPosition="right"
        right={<div data-testid="visual-panel">Visual</div>}
      >
        <div data-testid="auth-panel">Auth</div>
      </SplitLayout>,
    );

    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();

    const children = Array.from(grid!.children);
    expect(children[0].querySelector('[data-testid="auth-panel"]')).not.toBeNull();
    expect(children[1].querySelector('[data-testid="visual-panel"]')).not.toBeNull();
  });
});
