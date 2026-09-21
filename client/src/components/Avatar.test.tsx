import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "@/components/Avatar";

describe("Avatar", () => {
  it("renders the image when url is provided", () => {
    const { container } = render(<Avatar url="https://example.com/a.png" />);
    const image = container.querySelector("img");

    expect(image).toHaveAttribute("src", "https://example.com/a.png");
    expect(image).toHaveAttribute("alt", "");
  });

  it("falls back to the icon when there is no url", () => {
    const { container, getByTitle } = render(<Avatar name="Ada" />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(getByTitle("Ada")).toBeInTheDocument();
  });

  it("uses the accented styles when accented is true", () => {
    const { getByTitle } = render(<Avatar name="Ada" accented />);

    expect(getByTitle("Ada")).toHaveClass("bg-indigo-50", "text-indigo-500");
  });

  it("switches to the icon when the image fails to load", () => {
    const { container, getByTitle } = render(
      <Avatar url="https://example.com/broken.png" name="Ada" />
    );
    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    fireEvent.error(image!);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(getByTitle("Ada")).toBeInTheDocument();
  });
});
