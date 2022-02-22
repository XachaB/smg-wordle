import { Clue } from "./clue";
import { Row, RowState } from "./Row";
import { maxGuesses } from "./util";

export function About(language: string) {

    let words : Record<string, string[][]> = {
        "Nuer":  [["r","i̲","e","t"], ["c","i","e","k"], ["t","i","e","l"]],
        "Archi": [["w", "o", "r", "d"], ["b","a","r","k"], ["d","a","r","t"]]
    }

    let help_texts : Record<string, any> = {
        "Nuer":  (<p>Some help text</p>),
        "Archi": (<p>Some help text</p>),
    }
    let word=words[language];
  return (
    <div className="App-about">
      <p>
        This is a {language} remake of the word game{" "}
        <a href="https://www.powerlanguage.co.uk/wordle/">
          <i>Wordle</i>
        </a>{" "}
          by <a href="https://twitter.com/powerlanguish">powerlanguage</a>, based on the open source version <a href="https://hellowordl.net/">Hello Wordl</a>.
      </p>
      <hr />
        {help_texts[language]}
      <hr />
      <p>
        You get {maxGuesses} tries to guess a target word. The game answers each guess by colored feedback.
      </p>
      <Row
        rowState={RowState.LockedIn}
        wordLength={4}
        cluedLetters={[
          { clue: Clue.Absent, letter: word[0][0] },
          { clue: Clue.Absent, letter: word[0][1] },
          { clue: Clue.Correct, letter: word[0][2] },
          { clue: Clue.Elsewhere, letter: word[0][3] },

        ]}
        annotation={'"word"'}
      />
      <p>
        <b>{word[0][0]}</b> and <b>{word[0][1]}</b> aren't in the target word.
        The third letter is <b className={"green-bg"}>{word[0][2]}</b>
        . (There may be more {word[0][2]}). <b className={"yellow-bg"}>{word[0][3]}</b> occurs once or more <em>elsewhere</em> in the target
        word.
      </p>
      <Row
        rowState={RowState.LockedIn}
        wordLength={4}
        cluedLetters={[
          { clue: Clue.Absent, letter: word[1][0] },
          { clue: Clue.Correct, letter: word[1][1] },
          { clue: Clue.Correct, letter: word[1][2] },
          { clue: Clue.Absent, letter: word[1][3] },
        ]}
        annotation={"So close!"}
      />
      <Row
        rowState={RowState.LockedIn}
        wordLength={4}
        cluedLetters={[
          { clue: Clue.Correct, letter: word[2][0] },
          { clue: Clue.Correct, letter: word[2][1] },
          { clue: Clue.Correct, letter: word[2][2] },
          { clue: Clue.Correct, letter: word[2][3] },
        ]}
        annotation={"Got it!"}
      />
        <hr/>
      <p>
        Report issues{" "}
        <a href="https://github.com/lynn/hello-wordl/issues">here</a>.
      </p>
    </div>
  );
}
