import { Clue, clueClass } from "./clue";

interface KeyboardProps {
  language: string;
  letterInfo: Map<string, Clue>;
  onKey: (key: string) => void;
}

export function Keyboard(props: KeyboardProps) {
  const layouts: Record<string, string> =
      {"Nuer": "a|a̱|b|c|d|e|e̱|f|g|h|i|i̱|j-k|l|m|n|o|o̱|p|q|r|s|t|u|w-B|y|ä|ë|ö|ŋ|ɔ|ɔ̱|ɛ|ɛ̈|ɛ̱|ɛ̱̈|ɣ|E",
      "Archi": "test-test-EtestB"};
  const keyboard = layouts[props.language]
    .split("-")
    .map((row) =>
      row
        .split("|")
        .map((key) => key.replace("B", "Backspace").replace("E", "Enter"))
    );

  return (
    <div className="Game-keyboard" aria-hidden="true">
      {keyboard.map((row, i) => (
        <div key={i} className="Game-keyboard-row">
          {row.map((label, j) => {
            let className = "Game-keyboard-button";
            const clue = props.letterInfo.get(label);
            if (clue !== undefined) {
              className += " " + clueClass(clue);
            }
            if (label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").length > 1) {
              className += " Game-keyboard-button-wide";
            }
            return (
              <button
                tabIndex={-1}
                key={j}
                className={className}
                onClick={() => {
                  props.onKey(label);
                }}
              >
                {label.replace("Backspace", "⌫")}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
