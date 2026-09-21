import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpandableMessage } from "@/components/ExpandableMessage";

const shortText = "a".repeat(140);
const longText = "a".repeat(141);

describe("ExpandableMessage", () => {
  it("renders short text without a toggle", () => {
    const { getByText, queryByRole } = render(
      <ExpandableMessage text={shortText} showMore="Show more" showLess="Show less" />
    );

    expect(getByText(shortText)).toBeInTheDocument();
    expect(getByText(shortText)).not.toHaveClass("line-clamp-2");
    expect(queryByRole("button")).not.toBeInTheDocument();
  });

  it("clamps long text and shows the more control", () => {
    const { getByText, getByRole } = render(
      <ExpandableMessage text={longText} showMore="Show more" showLess="Show less" />
    );
    const button = getByRole("button");

    expect(getByText(longText)).toHaveClass("line-clamp-2");
    expect(button).toHaveTextContent("Show more");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("expands and collapses on click", () => {
    const { getByText, getByRole } = render(
      <ExpandableMessage text={longText} showMore="Show more" showLess="Show less" />
    );
    const paragraph = getByText(longText);
    const button = getByRole("button");

    fireEvent.click(button);

    expect(button).toHaveTextContent("Show less");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(paragraph).not.toHaveClass("line-clamp-2");
    expect(button.querySelector("svg")).toHaveClass("rotate-180");

    fireEvent.click(button);

    expect(button).toHaveTextContent("Show more");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(paragraph).toHaveClass("line-clamp-2");
    expect(button.querySelector("svg")).not.toHaveClass("rotate-180");
  });

  it("does not bubble the toggle click", () => {
    const onParentClick = vi.fn();
    const { getByRole } = render(
      <div onClick={onParentClick}>
        <ExpandableMessage text={longText} showMore="Show more" showLess="Show less" />
      </div>
    );

    fireEvent.click(getByRole("button"));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
