import "./App.css";
import {maxGuesses, urlParam} from "./util";
import Game from "./Game";
import {useEffect, useState} from "react";
import {About} from "./About";

function useSetting<T>(
    key: string,
    initial: T
): [T, (value: T | ((t: T) => T)) => void] {
    const [current, setCurrent] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initial;
        } catch (e) {
            return initial;
        }
    });
    const setSetting = (value: T | ((t: T) => T)) => {
        try {
            const v = value instanceof Function ? value(current) : value;
            setCurrent(v);
            window.localStorage.setItem(key, JSON.stringify(v));
        } catch (e) {
        }
    };
    return [current, setSetting];
}

function parseUrlLanguage(): string {
    const langParam = urlParam("language");
    const lang = langParam === "Archi" || langParam === "Nuer" ? langParam : "Nuer";
    return lang;
}
function App() {
    type Page = "game" | "about" | "settings";
    const [page, setPage] = useState<Page>("game");
    const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    const [dark, setDark] = useSetting<boolean>("dark", prefersDark);
    const [colorBlind, setColorBlind] = useSetting<boolean>("colorblind", false);
    const [difficulty, setDifficulty] = useSetting<number>("difficulty", 0);
    const [language, setLanguage] = useState(parseUrlLanguage());
    const gameName: Record<string, string> =
        {
            "Nuer": "Nuerdle",
            "Archi": "Archidle"
        };
    useEffect(() => {
        document.body.className = dark ? "dark" : "";
        setTimeout(() => {
            // Avoid transition on page load
            document.body.style.transition = "0.3s background-color ease-out";
        }, 1);
    }, [dark]);

    const link = (emoji: string, label: string, page: Page) => (
        <button
            className="emoji-link"
            onClick={() => setPage(page)}
            title={label}
            aria-label={label}
        >
            {emoji}
        </button>
    );

    return (
        <div className={"App-container" + (colorBlind ? " color-blind" : "")}>
            <div id="header">
                <h1><a href={"https://www.smg.surrey.ac.uk/"}><img
                    src={process.env.PUBLIC_URL + "/logo-main.png"} alt="SMG"
                    className="logo"/></a>
                    <span className="gametitle">{gameName[language]}</span>
                </h1>
                <div className="top-right">
                    {page !== "game" ? (
                        link("❌", "Close", "game")
                    ) : (
                        <>
                            {link("❓", "About", "about")}
                            {link("⚙️", "Settings", "settings")}
                        </>
                    )}
                </div>
            </div>
            {page === "about" && About(language)}
            {page === "settings" && (
                <div className="Settings">
                    <div className="Settings-setting">
                        <input
                            id="dark-setting"
                            type="checkbox"
                            checked={dark}
                            onChange={() => setDark((x: boolean) => !x)}
                        />
                        <label htmlFor="dark-setting">Dark theme</label>
                    </div>
                    <div className="Settings-setting">
                        <input
                            id="colorblind-setting"
                            type="checkbox"
                            checked={colorBlind}
                            onChange={() => setColorBlind((x: boolean) => !x)}
                        />
                        <label htmlFor="colorblind-setting">High-contrast
                            colors</label>
                    </div>
                    <div className="Settings-setting">
                        <input
                            id="difficulty-setting"
                            type="range"
                            min="0"
                            max="2"
                            value={difficulty}
                            onChange={(e) => setDifficulty(+e.target.value)}
                        />
                        <div>
                            <label htmlFor="difficulty-setting">Difficulty:</label>
                            <strong>{["Normal", "Hard", "Ultra Hard"][difficulty]}</strong>
                            <div
                                style={{
                                    fontSize: 14,
                                    height: 40,
                                    marginLeft: 8,
                                    marginTop: 8,
                                }}
                            >
                                {
                                    [
                                        `Guesses must be valid dictionary words.`,
                                        `Wordle's "Hard Mode". Green letters must stay fixed, and yellow letters must be reused.`,
                                        `An even stricter Hard Mode. Yellow letters must move away from where they were clued, and gray clues must be obeyed.`,
                                    ][difficulty]
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Game
                maxGuesses={maxGuesses}
                hidden={page !== "game"}
                difficulty={difficulty}
                colorBlind={colorBlind}
                language={language}
                setLanguage={setLanguage}
            />
        </div>
    );
}

export default App;
