/**
 * We export only the HTML part of the js-beautify library to minimize the size
 * of the final bundle.
 */

// @ts-expect-error
import html_beautify_function from "js-beautify/js/src/html/index";
import type { html } from "js-beautify";
export const htmlBeautify: typeof html = html_beautify_function;
