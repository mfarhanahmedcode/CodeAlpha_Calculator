const expressionEl = document.getElementById("expression");
const currentEl = document.getElementById("current");
const keysEl = document.getElementById("keys");
const themeToggleBtn = document.getElementById("themeToggle");
const historyToggleBtn = document.getElementById("historyToggle");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");

const state = {
    firstValue: null,
    operator: null,
    secondValue: "0",
    overwrite: false,
};

function updateDisplay() {
    currentEl.classList.remove("error");
    currentEl.textContent = formatNumber(state.secondValue);

    if (state.operator && state.firstValue !== null) {
        expressionEl.textContent = `${formatNumber(state.firstValue)} ${state.operator}`;
    } else {
        expressionEl.textContent = "\u00A0";
    }
}

function formatNumber(value) {
    if (value === "Error") return value;
    const [intPart, decimalPart] = String(value).split(".");
    const formattedInt = Number(intPart).toLocaleString("en-US");
    return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

function showError(message) {
    currentEl.classList.add("error");
    currentEl.textContent = message;
    expressionEl.textContent = "\u00A0";

    state.firstValue = null;
    state.operator = null;
    state.secondValue = "0";
    state.overwrite = true;
}

// Core actions
function inputNumber(digit) {
    if (state.overwrite) {
        state.secondValue = digit;
        state.overwrite = false;
        return;
    }
    if (state.secondValue === "0") {
        state.secondValue = digit;
    } else if (state.secondValue.replace("-", "").replace(".", "").length < 15) {
        state.secondValue += digit;
    }
}

function inputDecimal() {
    if (state.overwrite) {
        state.secondValue = "0.";
        state.overwrite = false;
        return;
    }
    if (!state.secondValue.includes(".")) {
        state.secondValue += ".";
    }
}

function chooseOperator(op) {
    if (state.operator && !state.overwrite) {
        calculate();
    }
    state.firstValue = state.secondValue;
    state.operator = op;
    state.overwrite = true;
}

function calculate() {
    if (state.operator === null || state.firstValue === null) return;

    const a = parseFloat(state.firstValue);
    const b = parseFloat(state.secondValue);
    let result;

    switch (state.operator) {
        case "+":
            result = a + b;
            break;
        case "-":
            result = a - b;
            break;
        case "*":
            result = a * b;
            break;
        case "/":
            // error handling: division by zero
            if (b === 0) {
                addHistoryEntry(`${a} / ${b}`, "Error");
                showError("Can't / 0");
                return;
            }
            result = a / b;
            break;
        default:
            return;
    }

    // Round to avoid floating point artifacts like 0.1 + 0.2 = 0.30000000004
    result = Math.round(result * 1e10) / 1e10;

    const expressionText = `${formatNumber(state.firstValue)} ${state.operator} ${formatNumber(state.secondValue)}`;
    addHistoryEntry(expressionText, formatNumber(result));

    state.secondValue = String(result);
    state.firstValue = null;
    state.operator = null;
    state.overwrite = true;
}

function clearAll() {
    state.firstValue = null;
    state.operator = null;
    state.secondValue = "0";
    state.overwrite = false;
}

function deleteLast() {
    if (state.overwrite) return;
    if (state.secondValue.length === 1 || (state.secondValue.length === 2 && state.secondValue.startsWith("-"))) {
        state.secondValue = "0";
    } else {
        state.secondValue = state.secondValue.slice(0, -1);
    }
}

function applyPercent() {
    state.secondValue = String(parseFloat(state.secondValue) / 100);
}

// History panel
function addHistoryEntry(expressionText, resultText) {
    const placeholder = historyList.querySelector(".history-empty");
    if (placeholder) placeholder.remove();

    const item = document.createElement("li");
    item.innerHTML = `
    <span class="history-expr">${expressionText} =</span>
    <span class="history-result">${resultText}</span>
  `;
    item.addEventListener("click", () => {
        state.secondValue = String(resultText).replace(/,/g, "");
        state.firstValue = null;
        state.operator = null;
        state.overwrite = true;
        updateDisplay();
    });

    historyList.prepend(item);
}

function clearHistory() {
    historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
}

// Sound effects
let audioCtx = null;
function playClickSound() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
    }
}

// Button press visual animation
function animateKey(button) {
    button.classList.remove("pressed");
    void button.offsetWidth; // restart animation
    button.classList.add("pressed");
    setTimeout(() => button.classList.remove("pressed"), 350);
}

// Main click handler
keysEl.addEventListener("click", (e) => {
    const button = e.target.closest(".key");
    if (!button) return;

    animateKey(button);
    playClickSound();
    handleAction(button.dataset.action, button.dataset.value);
});

function handleAction(action, value) {
    switch (action) {
        case "number":
            inputNumber(value);
            break;
        case "decimal":
            inputDecimal();
            break;
        case "operator":
            chooseOperator(value);
            break;
        case "equals":
            calculate();
            break;
        case "clear":
            clearAll();
            break;
        case "delete":
            deleteLast();
            break;
        case "percent":
            applyPercent();
            break;
    }
    updateDisplay();
}

// Keyboard support
window.addEventListener("keydown", (e) => {
    const keyMap = {
        "+": '.key-operator[data-value="+"]',
        "-": '.key-operator[data-value="-"]',
        "*": '.key-operator[data-value="*"]',
        "/": '.key-operator[data-value="/"]',
        "Enter": ".key-equals",
        "=": ".key-equals",
        "Backspace": '[data-action="delete"]',
        "Escape": '[data-action="clear"]',
        ".": '[data-action="decimal"]',
        "%": '[data-action="percent"]',
    };

    let selector = null;

    if (e.key >= "0" && e.key <= "9") {
        selector = `.key-number[data-value="${e.key}"]`;
    } else if (keyMap[e.key]) {
        selector = keyMap[e.key];
    }

    if (!selector) return;

    e.preventDefault();
    const button = document.querySelector(selector);
    if (button) {
        animateKey(button);
        playClickSound();
        handleAction(button.dataset.action, button.dataset.value);
    }
});

// Theme toggle (light / dark mode) 
themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    themeToggleBtn.textContent = document.body.classList.contains("light-theme") ? "☀️" : "🌙";
});

// History panel toggle 
historyToggleBtn.addEventListener("click", () => {
    historyPanel.classList.toggle("open");
});

clearHistoryBtn.addEventListener("click", clearHistory);

// Initial render 
updateDisplay();