import { Clue } from "./clue";
import { Row, RowState } from "./Row";
import { maxGuesses } from "./util";

export function About(language: string) {

    let words : Record<string, string[][]> = {
        "Nuer":  [["r","i̲","e","t"], ["c","i","e","k"], ["t","i","e","m"]],
        "Archi": [["а", "в", "a", "л"], ["х","I","а","ж"], ["л","I","а","н"]]
    }

    let help_texts : Record<string, any> = {
        "Nuer":  (<div><p>The Nuer language, also known as Thok Nath, is a West Nilotic language spoken by approximately 900,000 to two million people in South Sudan and Ethiopia,
            as well as in diaspora communities throughout the world. The <a href="https://www.smg.surrey.ac.uk/">Surrey Morphology Group</a> from the <a href="https://www.surrey.ac.uk/">University of Surrey</a> has been developing an <a href="https://www.nuerlexicon.com/">interactive online dictionary</a> for it,
            the first ever of its kind.</p><p>The words used in this puzzle have been taken from the <a href="https://find.bible/bibles/NUSBSS/">Nuer translation of the Bible</a>, and from the <a href="https://www.nuerlexicon.com/">Nuer Lexicon</a>.
        Any form of any word is a valid answer, so long as it is found in one of these sources. For example, rɔɔmä ‘of the sheep’, tetdu ‘your hand’ and camkɛ ‘they eat’ are all possible five letter words. Whenever the word is in our lexicon, we provide a short definition and a link to the lexicon.</p></div>),
            "Archi":  (<div><p>Archi is a Daghestanian language of the Lezgic group spoken by about 1200 people in Daghestan. The <a href="https://www.smg.surrey.ac.uk/">Surrey Morphology Group</a> from the <a href="https://www.surrey.ac.uk/">University of Surrey</a> has created a <a href="https://www.smg.surrey.ac.uk/archi-dictionary/">dictionary of Archi</a>.</p><p>The words used in this puzzle have been taken from this dictionnary.
        Any form of any word in the dictionnary is a valid answer. Links to the dictionnary entry are provided for valid words</p></div>),
    }
    let word=words[language];
  return (
    <div className="App-about">
      <p>
        This is a {language} remake of the word game{" "}
        <a href="https://www.powerlanguage.co.uk/wordle/">
          <i>Wordle</i>, originally
        </a>{" "}
          by <a href="https://twitter.com/powerlanguish">powerlanguage</a>. This version was created by by <a href={"https://sacha.beniamine.net"}>Sacha Beniamine</a> based on the open source version <a href="https://hellowordl.net/">Hello Wordl</a>.
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
        annotation={<span>one correct letter</span>}
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
        annotation={<span>So close!</span>}
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
        annotation={<span>Got it!</span>}
      />
        <hr/>
      <p>
        Report issues{" "}
        <a href="https://github.com/lynn/hello-wordl/issues">here</a>.
      </p>
    </div>
  );
}
