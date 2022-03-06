import {memo, ReactElement, useEffect, useMemo, useRef, useState} from "react";
import {Spoiler} from "react-spoiler-tag";
import {Row, RowState} from "./Row";
import nuer_words from "./nuer_words.json";
import nuer_annots from "./nuer_annots.json";
import archi_words from "./archi_words.json";
import archi_annots from "./archi_annots.json";
import {Clue, clue, describeClue, violation} from "./clue";
import {Keyboard} from "./Keyboard";
import {Difficulty, hashCode, mulberry32, pick, pickToday, speak, urlParam} from "./util";

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

function getExamples(target: string[], language: string, wordLength: number, numExamples: number): string[][] {
    // Words of the correct length, in the appropriate language, with translations
    const eligible: string[] = dictionnaries[language].filter((word) => {
            let w = word.split("|");
            return (w.length === wordLength) && annotations[language].hasOwnProperty(w.join(""))
        }
    );
    let random = mulberry32(hashCode(target.join("")));
    let result = [];
    let known_chars = new Set<string>();
    while (result.length < numExamples) {
        let w = pick<string>(eligible, random()).split("|");
        let common = w.map((c) => Number(known_chars.has(c))).reduce((a, b) => a + b, 0);
        if (common < (wordLength / 2)) {
            result.push(w);
            w.forEach(c => known_chars.add(c));
        }
    }
    console.log("Regenerated examples");
    return result
}

function translationLink(w: string[], language: string, nullDefault: boolean): ReactElement | null {
    let infos = annotations[language];
    let word = w.join("");
    if (infos.hasOwnProperty(word)) {
        let annot_vals = infos[word];
        return (<a href={annot_vals[1]} target="_blank"
                   rel="noopener noreferrer">{annot_vals[0]}</a>)
    }
    if (nullDefault) {
        return null
    }
    return (<span className="no-translation">no translation available</span>)
}


function gameOver(verbed: string, target: string[], language: string): ReactElement {
    let annot = translationLink(target, language, false);
    return (<span className="hint">You {verbed} ! The answer was <span className="word">{target.join("")}</span> ({annot})</span>);
}

function randomTarget(wordLength: number, language: string): string[] {
    const eligible: string[] = dictionnaries[language].filter((word) => word.length === wordLength + (wordLength - 1)
     && annotations[language].hasOwnProperty(word.split("|").join("")));
    return pickToday<string>(eligible).split("|");
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
    const [hint, setHint] = useState<ReactElement | null>(() => (
        <span className="hint">Make your first guess!</span>));
    const [target, setTarget] = useState(() => randomTarget(wordLength, props.language));
    const tableRef = useRef<HTMLTableElement>(null);

    async function share(copiedHint: string, text?: string) {
        const url = window.location.origin + `?length=${wordLength}&language=${props.language}`;
        const body = `SMG wordle game for the ${props.language} language\n` + url + (text ? "\n\n" + text : "");
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
            setHint((<span className="hint">{copiedHint}</span>));
            return;
        } catch (e) {
            console.warn("navigator.clipboard.writeText failed:", e);
        }
        setHint((<span className="hint">{url}</span>));
    }

    const onKey = (key: string) => {
        if (guesses.length === props.maxGuesses) return;
        if (key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").length < 3) {

            setCurrentGuess((guess) => guess.concat([key.toLowerCase()]).slice(0, wordLength));
            tableRef.current?.focus();
            setHint(null);
        } else if (key === "Backspace") {
            setCurrentGuess((guess) => guess.slice(0, -1));
            setHint(null);
        } else if (key === "Enter") {
            if (currentGuess.length !== wordLength) {
                setHint((<span className="hint">Too short</span>));
                return;
            }
            if (!dictionnaries[props.language].includes(currentGuess.join("|"))) {
                setHint((<span className="hint">Not a valid word</span>));
                return;
            }
            for (const g of guesses) {
                const c = clue(g, target);
                const feedback = violation(props.difficulty, c, currentGuess);
                if (feedback) {
                    setHint((<span className="hint">{feedback}</span>));
                    return;
                }
            }
            setGuesses((guesses) => guesses.concat([currentGuess]));
            setCurrentGuess([]);
            if (currentGuess.join("") === target.join("")) {
                setHint(gameOver("won", target, props.language));
                setGameState(GameState.Won);
            } else if (guesses.length + 1 === props.maxGuesses) {
                setHint(gameOver("lost", target, props.language));
                setGameState(GameState.Lost);
            } else {
                setHint(null);
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

            let annot = null;
            if ((guess.length === wordLength)) {
                annot = translationLink(guess, props.language, true);
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
    const examples = useMemo( () => getExamples(target, props.language, wordLength, 6),
        [target, props.language, wordLength]);
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
                        setHint((
                            <span className="hint">Play {new_language} words</span>));
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
                        setHint((<span className="hint">{length} letters</span>));
                    }}
                >
                    {wordlengths.map((val, i) => {
                        return (<option value={val}
                                        key={"length_" + i.toString()}>{val}</option>);
                    })
                    }
                </select>
                <button
                    style={{flex: "0 0 auto"}}
                    disabled={(gameState !== GameState.Playing) || (guesses.length === 0)}
                    onClick={() => {
                        setHint(gameOver("lost", target, props.language));
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
                <p>Need help ? Try one of these: <Spoiler
                    ariaLabelShowText="Click here for some ideas"
                    ariaLabelHideText="To hide spoiler text again click here."
                    hiddenColor="currentColor"
                    revealedColor="transparent"
                >
                    {examples.map((word, i) => {

                        let translation = translationLink(word, props.language, true);
                        let key = "suggestion-" + i.toString();
                        let sep = i < (examples.length - 1) ? "; " : "";
                        return (<span className="suggestion" key={key}> <span
                            className="word">{word.join("")}</span> ({translation}){sep}</span>)
                    })}
                </Spoiler>.</p>
                    <p>Find more <a
                        href={smg_databases[props.language]}>{props.language}</a> words
                    in the <a href={"https://www.smg.surrey.ac.uk/databases/"}>SMG
                            databases</a>.</p>
            </div>
        </div>
    );
}

export default Game;
