// Sensitive credentials in client file
var apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.s3cr3t";

function handleUserInput(input) {
  // Storing token in localStorage (XSS accessible)
  localStorage.setItem("authToken", apiKey);

  // Loose equality
  if (input == 0) {
    console.log("Input matched zero with loose comparison");
  }

  // DOM XSS vulnerability
  const outputEl = document.getElementById("results");
  outputEl.innerHTML = input;

  // Arbitrary execution via eval
  eval("console.log('Processed: ' + input)");

  // Prototype pollution risk
  const target = {};
  target.__proto__.isAdmin = true;
}

function legacyHandler() {
  // Legacy var keyword
  var counter = 0;
  var items = [1, 2, 3];
}
