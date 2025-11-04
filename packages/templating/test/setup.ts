import { JSDOM } from "jsdom";

// Setup JSDOM for DOMPurify
const jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.window = jsdom.window as any;
globalThis.document = jsdom.window.document as any;

