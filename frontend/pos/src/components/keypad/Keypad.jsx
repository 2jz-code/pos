import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import PropTypes from "prop-types";

export const Keypad = ({ 
  value = "", 
  onChange, 
  onClose, 
  title = "Enter Value",
  maxLength = 10,
  decimal = false
}) => {
  // Ensure value is always a string
  const [inputValue, setInputValue] = useState(String(value || ""));

  useEffect(() => {
    // Ensure value is always a string
    setInputValue(String(value || ""));
  }, [value]);

  const handleKeyPress = (key) => {
    if (key === "backspace") {
      // Ensure we're working with a string
      setInputValue(prev => String(prev).slice(0, -1));
    } else if (key === "clear") {
      setInputValue("");
    } else if (key === "." && decimal) {
      if (!String(inputValue).includes(".")) {
        setInputValue(prev => String(prev) + key);
      }
    } else if (/[0-9]/.test(key)) {
      // Handle leading zeros - replace if the current value is just "0"
      if (inputValue === "0" && key !== "0") {
        setInputValue(key);
      } else if (String(inputValue).length < maxLength) {
        setInputValue(prev => String(prev) + key);
      }
    }
  };

  const handleSubmit = () => {
    // Remove leading zeros for non-decimal numbers
    let formattedValue = String(inputValue);
    if (formattedValue.startsWith("0") && !formattedValue.startsWith("0.") && formattedValue.length > 1) {
      formattedValue = formattedValue.replace(/^0+/, "");
    }
    
    onChange(formattedValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-sm"
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-center flex-1">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="bg-gray-100 rounded-lg p-3 mb-4">
            <p className="text-2xl font-mono text-right">{inputValue || "0"}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, decimal ? "." : "00", 0, "backspace"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`p-4 text-xl font-medium rounded-lg ${
                  key === "backspace" 
                    ? "bg-red-100 text-red-600" 
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {key === "backspace" ? "⌫" : key}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={() => setInputValue("")}
            className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

Keypad.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  maxLength: PropTypes.number,
  decimal: PropTypes.bool
};
  
// Add displayName for better debugging
Keypad.displayName = "Keypad";