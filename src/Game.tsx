import {useEffect, useRef, useState} from "react";
import {Row, RowState} from "./Row";
import nuer_words from "./nuer_words.json";
import nuer_annots from "./nuer_annots.json";
import archi_words from "./archi_words.json";
import archi_annots from "./archi_annots.json";
import {Clue, clue, describeClue, violation} from "./clue";
import {Keyboard} from "./Keyboard";
import {
    describeSeed,
    dictionarySets,
    Difficulty,
    pick,
    resetRng,
    seed,
    speak,
    urlParam,
} from "./util";
import {decode, encode} from "./base64";

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
    getLanguage: () => string;
    updateLanguage: (arg: string) => void
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
    const eligible = dictionnaries[language].filter((word) => word.length === wordLength + (wordLength - 1));
    return pick(eligible).split("|");
}

function getChallengeUrl(target: string[]): string {
    return (
        window.location.origin +
        window.location.pathname +
        "?challenge=" +
        encode(target.join("|"))
    );
}

let initChallenge: string[] = [];
let challengeError = false;
try {
    let preset = urlParam("challenge");
    if (preset) {
        initChallenge = decode(preset).split("|");
    }
} catch (e) {
    console.warn(e);
    challengeError = true;
}

function parseUrlLength(): number {
    const lengthParam = urlParam("length");
    if (!lengthParam) return 4;
    const length = Number(lengthParam);
    return length >= minLength && length <= maxLength ? length : 4;
}

function parseUrlGameNumber(): number {
    const gameParam = urlParam("game");
    if (!gameParam) return 1;
    const gameNumber = Number(gameParam);
    return gameNumber >= 1 && gameNumber <= 1000 ? gameNumber : 1;
}


function Game(props: GameProps) {


    const [gameState, setGameState] = useState(GameState.Playing);
    const [guesses, setGuesses] = useState<string[][]>([]);
    const [currentGuess, setCurrentGuess] = useState<string[]>([]);
    const [challenge, setChallenge] = useState<string[]>(initChallenge);

    const [wordLength, setWordLength] = useState(
        challenge.length | parseUrlLength()
    );
    const [gameNumber, setGameNumber] = useState(parseUrlGameNumber());
    const [target, setTarget] = useState(() => {
        resetRng();
        // Skip RNG ahead to the parsed initial game number:
        for (let i = 1; i < gameNumber; i++) randomTarget(wordLength, props.getLanguage());
        return challenge.length ? challenge : randomTarget(wordLength, props.getLanguage());
    });
    const [hint, setHint] = useState<string>(() => {
            if ((challenge.length > 0) && !dictionarySets[props.getLanguage()].has(challenge.join("|"))) {
                setChallenge([]);
                challengeError = true;
            }
            return challengeError
                ? `Invalid challenge string, playing random game.`
                : `Make your first guess!`
        }
    );
    const currentSeedParams = () =>
        `?seed=${seed}&length=${wordLength}&game=${gameNumber}`;
    useEffect(() => {
        if (seed) {
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname + currentSeedParams()
            );
        }
    }, [wordLength, gameNumber]);
    const tableRef = useRef<HTMLTableElement>(null);
    const startNextGame = () => {
        if (challenge) {
            // Clear the URL parameters:
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        setChallenge([]);
        const newWordLength =
            wordLength >= minLength && wordLength <= maxLength ? wordLength : 4;
        setWordLength(newWordLength);
        setTarget(randomTarget(newWordLength, props.getLanguage()));
        setHint("");
        setGuesses([]);
        setCurrentGuess([]);
        setGameState(GameState.Playing);
        setGameNumber((x) => x + 1);
    };

    async function share(copiedHint: string, text?: string) {
        const url = seed
            ? window.location.origin + window.location.pathname + currentSeedParams()
            : getChallengeUrl(target);
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
        if (gameState !== GameState.Playing) {
            if (key === "Enter") {
                startNextGame();
            }
            return;
        }
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
            if (!dictionnaries[props.getLanguage()].includes(currentGuess.join("|"))) {
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
            setCurrentGuess((guess) => []);
            const gameOver = (verbed: string) =>
                `You ${verbed}! The answer was ${target.join().toLowerCase()}. (Enter to ${
                    challenge ? "play a random game" : "play again"
                })`;
            console.log(currentGuess);
            console.log(target);
            console.log(currentGuess.join("") === target.join(""));
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
            let infos = annotations[props.getLanguage()];
            let annot = null;
            if ((guess.length == wordLength) && infos.hasOwnProperty(guess.join(""))) {
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
                    value={props.getLanguage()}
                    onChange={(e) => {
                        console.log("before:", props.getLanguage());
                        props.updateLanguage(e.target.value);
                        console.log("after:", props.getLanguage());
                        startNextGame();
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
                        (guesses.length > 0 || currentGuess.length > 0 || challenge.length > 0)
                    }
                    value={wordLength}
                    onChange={(e) => {
                        const length = Number(e.target.value);
                        resetRng();
                        setGameNumber(1);
                        setGameState(GameState.Playing);
                        setGuesses([]);
                        setCurrentGuess([]);
                        setTarget(randomTarget(length, props.getLanguage()));
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
                            `The answer was ${target.join("").toUpperCase()}. (Enter to play again)`
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
                language={props.getLanguage()}
                letterInfo={letterInfo}
                onKey={onKey}
            />
            <div className="Game-seed-info">
                {challenge.length
                    ? "playing a challenge game"
                    : seed
                        ? `${describeSeed(seed)} — length ${wordLength}, game ${gameNumber}`
                        : "playing a random game"}
            </div>
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
                href={smg_databases[props.getLanguage()]}>{props.getLanguage()}</a> words
                in the <a href={"https://www.smg.surrey.ac.uk/databases/"}>SMG
                databases</a>.
            </p>
            </div>
        </div>
    );
}

export default Game;
