import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export const scrape = async ({
  url,
}: {
  url: string;
}) => {
  const response = await fetch(url);
  const html = await response.text();
  const article = extract(html);

  if (article == null) {
    return null;
  }

  const content = cleanString(article.content);
  const textContent = cleanString(article.textContent);

  return { ...article, content, textContent };
};

const extract = (html: string) => {
  var doc = parseHTML(html);
  let reader = new Readability(doc.window.document);
  return reader.parse();
};

const cleanString = (str: string) =>
  str
    // Replace various whitespace and zero-width characters with a single space
    .replace(/[\s\t\u200B-\u200D\uFEFF]+/g, " ")
    // Remove leading whitespace from each line in the string
    .replace(/^\s+/gm, "")
    // Collapse multiple newline characters into a single newline
    .replace(/\n+/g, "\n");
