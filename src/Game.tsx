import {useEffect, useRef, useState} from "react";
import {Row, RowState} from "./Row";
import nuer_words from "./nuer_words.json";
import nuer_annots from "./nuer_annots.json";
import archi_words from "./archi_words.json";
import archi_annots from "./archi_annots.json";
import {Clue, clue, describeClue, violation} from "./clue";
import {Keyboard} from "./Keyboard";
import {
    Difficulty,
    pick,
    speak,
    urlParam
} from "./util";

enum GameState {
    Playing,
    Won,
    Lost,
}


interface GameProps {
    maxGuesses: number;
    hidden: boolean;
    difficulty: Difficulty;
    colorBlind: boolean;
    language: string;
    setLanguage: (newlang: string) => void;
}

const minLength = 4;
const maxLength = 8;
const wordlengths = Array.from({length: (maxLength - minLength)}, (v, k) => k + minLength);

const smg_databases: Record<string, string> = {
    "Nuer": "https://www.nuerlexicon.com/",
    "Archi": "https://www.smg.surrey.ac.uk/archi-dictionary"
}

const dictionnaries: Record<string, string[]> = {
    "Nuer": nuer_words,
    "Archi": archi_words,
}
const annotations: Record<string, Record<string, string[]>> = {
    "Nuer": nuer_annots,
    "Archi": archi_annots,
}



function randomTarget(wordLength: number, language: string): string[] {
    const eligible: string[] = dictionnaries[language].filter((word) => word.length === wordLength + (wordLength - 1));
    return pick<string>(eligible).split("|");
}

function parseUrlLength(): number {
    const lengthParam = urlParam("length");
    if (!lengthParam) return 4;
    const length = Number(lengthParam);
    return length >= minLength && length <= maxLength ? length : 4;
}

function Game(props: GameProps) {

    const [gameState, setGameState] = useState(GameState.Playing);
    const [guesses, setGuesses] = useState<string[][]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>([]);
    const [wordLength, setWordLength] = useState(parseUrlLength());
    useEffect(() => {
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname + `?length=${wordLength}&language=${props.language}`
            );
    }, [wordLength, props.language]);
    const [hint, setHint] = useState<string>(() => `Make your first guess!`);
    const [target, setTarget] = useState(() => randomTarget(wordLength, props.language));
    const tableRef = useRef<HTMLTableElement>(null);

    async function share(copiedHint: string, text?: string) {
        const url = window.location.pathname + `?length=${wordLength}&language=${props.language}`;
        const body = "SMG wordle game\n" + url + (text ? "\n\n" + text : "");
        if (
            /android|iphone|ipad|ipod|webos/i.test(navigator.userAgent) &&
            !/firefox/i.test(navigator.userAgent)
        ) {
            try {
                await navigator.share({text: body});
                return;
            } catch (e) {
                console.warn("navigator.share failed:", e);
            }
        }
        try {
            await navigator.clipboard.writeText(body);
            setHint(copiedHint);
            return;
        } catch (e) {
            console.warn("navigator.clipboard.writeText failed:", e);
        }
        setHint(url);
    }

    const onKey = (key: string) => {
        if (guesses.length === props.maxGuesses) return;
        if (key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").length < 3) {

            setCurrentGuess((guess) => guess.concat([key.toLowerCase()]).slice(0, wordLength));
            tableRef.current?.focus();
            setHint("");
        } else if (key === "Backspace") {
            setCurrentGuess((guess) => guess.slice(0, -1));
            setHint("");
        } else if (key === "Enter") {
            if (currentGuess.length !== wordLength) {
                setHint("Too short");
                return;
            }
            if (!dictionnaries[props.language].includes(currentGuess.join("|"))) {
                setHint("Not a valid word");
                return;
            }
            for (const g of guesses) {
                const c = clue(g, target);
                const feedback = violation(props.difficulty, c, currentGuess);
                if (feedback) {
                    setHint(feedback);
                    return;
                }
            }
            setGuesses((guesses) => guesses.concat([currentGuess]));
            setCurrentGuess([]);
            const gameOver = (verbed: string) =>
                `You ${verbed}! The answer was ${target.join("").toLowerCase()}.`;
            if (currentGuess.join("") === target.join("")) {
                setHint(gameOver("won"));
                setGameState(GameState.Won);
            } else if (guesses.length + 1 === props.maxGuesses) {
                setHint(gameOver("lost"));
                setGameState(GameState.Lost);
            } else {
                setHint("");
                speak(describeClue(clue(currentGuess, target)));
            }
        }
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey) {
                onKey(e.key);
            }
            if (e.key === "Backspace") {
                e.preventDefault();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [currentGuess, gameState]);

    let letterInfo = new Map<string, Clue>();
    const tableRows = Array(props.maxGuesses)
        .fill(undefined)
        .map((_, i) => {
            const guess = [...guesses, currentGuess][i] ?? [];
            const cluedLetters = clue(guess, target);
            const lockedIn = i < guesses.length;
            if (lockedIn) {
                for (const {clue, letter} of cluedLetters) {
                    if (clue === undefined) break;
                    const old = letterInfo.get(letter);
                    if (old === undefined || clue > old) {
                        letterInfo.set(letter, clue);
                    }
                }
            }
            let infos = annotations[props.language];
            let annot = null;
            if ((guess.length === wordLength) && infos.hasOwnProperty(guess.join(""))) {
                let annot_vals = infos[guess.join("")];
                annot = (<a href={annot_vals[1]} target="_blank"
                            rel="noopener noreferrer">{annot_vals[0]}</a>);
            }
            return (
                <Row
                    key={i}
                    wordLength={wordLength}
                    rowState={
                        lockedIn
                            ? RowState.LockedIn
                            : i === guesses.length
                                ? RowState.Editing
                                : RowState.Pending
                    }
                    cluedLetters={cluedLetters}
                    annotation={annot}
                />
            );
        });
    return (
        <div className="Game" style={{display: props.hidden ? "none" : "block"}}>
            <div className="Game-options">
                <label htmlFor="language-setting">Language:</label>
                <select
                    name="language-setting"
                    id="language-setting"
                    value={props.language}
                    onChange={(e) => {
                        const new_language = e.target.value;
                        setGameState(GameState.Playing);
                        setGuesses([]);
                        setCurrentGuess([]);
                        setTarget(randomTarget(wordLength, new_language));
                        props.setLanguage(new_language);
                        setHint(`Play ${new_language} words`);
                    }}
                >
                    <option value="Nuer">Nuer</option>
                    <option value="Archi">Archi</option>
                </select>
                <label htmlFor="wordLength">Letters:</label>
                <select
                    name="wordLength"
                    id="wordLength"
                    disabled={
                        gameState === GameState.Playing &&
                        (guesses.length > 0 || currentGuess.length > 0)
                    }
                    value={wordLength}
                    onChange={(e) => {
                        const length = Number(e.target.value);
                        setGameState(GameState.Playing);
                        setGuesses([]);
                        setCurrentGuess([]);
                        setTarget(randomTarget(length, props.language));
                        setWordLength(length);
                        setHint(`${length} letters`);
                    }}
                >
                    {wordlengths.map((val, i) => {
                       return  (<option value={val} key={"length_" + i.toString()}>{val}</option>);
                    })
                    }
                </select>
                <button
                    style={{flex: "0 0 auto"}}
                    disabled={(gameState !== GameState.Playing) || (guesses.length === 0)}
                    onClick={() => {
                        setHint(
                            `The answer was ${target.join("").toLowerCase()}.`
                        );
                        setGameState(GameState.Lost);
                        (document.activeElement as HTMLElement)?.blur();
                    }}
                >
                    Give up
                </button>
            </div>
            <table
                className="Game-rows"
                tabIndex={0}
                aria-label="Table of guesses"
                ref={tableRef}
            >
                <tbody>{tableRows}</tbody>
            </table>
            <p
                role="alert"
                style={{
                    userSelect: /https?:/.test(hint) ? "text" : "none",
                    whiteSpace: "pre-wrap",
                }}
            >
                {hint || `\u00a0`}
            </p>
            <Keyboard
                language={props.language}
                letterInfo={letterInfo}
                onKey={onKey}
            />
            <p>
                <button
                    onClick={() => {
                        share("Link copied to clipboard!");
                    }}
                >
                    Share a link to this game
                </button>
                {" "}
                {gameState !== GameState.Playing && (
                    <button
                        onClick={() => {
                            const emoji = props.colorBlind
                                ? ["⬛", "🟦", "🟧"]
                                : ["⬛", "🟨", "🟩"];
                            share(
                                "Result copied to clipboard!",
                                decodeURIComponent(encodeURIComponent(guesses
                                    .map((guess) =>
                                        clue(guess, target)
                                            .map((c) => emoji[c.clue ?? 0])
                                            .join("")
                                    )
                                    .join("\n")))
                            );
                        }}
                    >
                        Share emoji results
                    </button>
                )}
            </p>

            <div className="Game-extra-infos">
                <p>Need help ? Find <a
                href={smg_databases[props.language]}>{props.language}</a> words
                in the <a href={"https://www.smg.surrey.ac.uk/databases/"}>SMG
                databases</a>.
            </p>
            </div>
        </div>
    );
}

export default Game;
