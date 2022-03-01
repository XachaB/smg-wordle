import { Clue, clueClass } from "./clue";

interface KeyboardProps {
  language: string;
  letterInfo: Map<string, Clue>;
  onKey: (key: string) => void;
}

export function Keyboard(props: KeyboardProps) {
  const layouts: Record<string, string> =
      {"Nuer": "ŋ|w|e|e̱|ë|r|t|y|u|i|i̱|o|p-a|a̱|ä|ɛ|ɛ̈|ɛ̱̈|d|ɣ|g|h|j|k|l-E|ɔ|ɔ̱|c|b|n|o̱|ö|m|B",
      "Archi": "й|ц|у|к|е|н|г|ш|щ|з|х|ъ-Ӏ|в|а|п|р|о|л|д|ж-E|ч|с|м|и|т|ь|б|B"};
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
