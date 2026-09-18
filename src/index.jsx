import PwaStatus, { registerPwa } from './PwaStatus';
import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// --- Defensive patches against browser translation extensions ---
// Browser translators (Google Translate, Microsoft Edge translator, etc.) wrap text nodes
// in <font> elements which breaks React's DOM reconciliation, causing
// "Failed to execute 'removeChild' on 'Node'" errors.
// We patch the prototypes to gracefully handle these cases.
if (typeof Node !== "undefined") {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      // Node was already removed (likely by translator). Skip silently.
      if (child.parentNode) return child.parentNode.removeChild(child);
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Reference node was moved or removed. Append at end instead.
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<><App /><PwaStatus /></>);

registerPwa();
