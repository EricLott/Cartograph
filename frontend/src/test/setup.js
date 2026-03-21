import '@testing-library/jest-dom';

// JSDOM does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = function() {};
