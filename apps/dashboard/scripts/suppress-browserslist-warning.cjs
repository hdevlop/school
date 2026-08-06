const originalWarn = console.warn;

console.warn = (...args) => {
  const [message] = args;

  if (
    typeof message === "string" &&
    message.includes("[baseline-browser-mapping]")
  ) {
    return;
  }

  originalWarn(...args);
};
