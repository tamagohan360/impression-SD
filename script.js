// ===============================
// 設定
// ===============================

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyMXkdPLPzSqs8Y_hEbFne9bC-PPSmVhHuYzNNFhBk03kr4ORJR2uUt9G-0Tfb5ffhN1w/exec";

const GITHUB_IMAGE_BASE =
  "https://raw.githubusercontent.com/tamagohan360/impression-SD/main/images/";


// ===============================
// 使用する画像
// ===============================

const TARGET_IMAGES = [
  "blouse_green (3).jpg",
  "sweater_white (4).jpg",
  "sweater_red (6).jpg",
  "jacket_black (3).jpg",
  "jacket_green (2).jpg"
];


// ===============================
// SD法の質問
// ===============================

const QUESTIONS = [
  ["不真面目", "真面目"],
  ["洗練されていない", "洗練された"],
  ["暖かそう", "涼しげ"],
  ["ダサい", "おしゃれ"],
  ["暗い", "明るい"],
  ["かわいい", "かっこいい"],
  ["安そう", "高級感がある"],
  ["フォーマル", "カジュアル"],
  ["硬い", "柔らかい"],
  ["すっきりしている", "かさばっている"],
  ["目立たない", "目立つ"],
  ["今っぽい", "昔っぽい"],
  ["つまらない", "面白い"],
  ["もてなさそう", "もてそう"],
  ["弱そう", "強そう"],
  ["爽やかでない", "爽やか"],
  ["装飾的", "シンプル"],
  ["地味", "華やか"],
  ["子供っぽい", "大人っぽい"],
  ["品がない", "上品"]
];


// ===============================
// localStorage
// ===============================

const RESPONDENT_ID_KEY =
  "impressionSDRespondentId";

const ANSWERS_KEY =
  "impressionSDAnswers";

const INDEX_KEY =
  "impressionSDCurrentIndex";


// ===============================
// 変数
// ===============================

let images = [];

let currentIndex = 0;

let answers = {};


// ===============================
// HTML要素
// ※ index.html のIDに合わせる
// ===============================

const statusEl =
  document.getElementById("status");

const surveyEl =
  document.getElementById("survey");

const completeEl =
  document.getElementById("complete");

const imageEl =
  document.getElementById("clothing-image");

const imageNameEl =
  document.getElementById("image-name");

const progressEl =
  document.getElementById("progress-text");

const progressBarEl =
  document.getElementById("progress-bar");

const questionsEl =
  document.getElementById("questions");

const answerForm =
  document.getElementById("answer-form");

const submitBtn =
  document.getElementById("submit-button");


// ===============================
// 画像を設定
// ===============================

function createImages() {

  images = TARGET_IMAGES.map(name => {

    return {
      name: name,

      url:
        GITHUB_IMAGE_BASE +
        encodeURIComponent(name)
    };

  });

}


// ===============================
// 回答者ID取得
// ===============================

async function getRespondentId() {

  const savedId =
    localStorage.getItem(
      RESPONDENT_ID_KEY
    );

  if (savedId) {

    return savedId;

  }


  const response =
    await fetch(GAS_URL);


  if (!response.ok) {

    throw new Error(
      "回答者IDを取得できませんでした。"
    );

  }


  const data =
    await response.json();


  if (!data.respondentId) {

    throw new Error(
      "回答者IDが取得できませんでした。"
    );

  }


  const respondentId =
    data.respondentId;


  localStorage.setItem(
    RESPONDENT_ID_KEY,
    respondentId
  );


  return respondentId;

}


// ===============================
// 質問表示
// ===============================

function renderQuestions() {

  questionsEl.innerHTML = "";


  QUESTIONS.forEach(
    (question, index) => {

      const questionDiv =
        document.createElement("div");

      questionDiv.className =
        "question";


      // --------------------------------
      // 質問文
      // --------------------------------

      const title =
        document.createElement("div");

      title.className =
        "question-title";

      title.textContent =
        `${question[0]}　　${question[1]}`;

      questionDiv.appendChild(title);


      // --------------------------------
      // 5段階評価
      // --------------------------------

      const scale =
        document.createElement("div");

      scale.className =
        "scale";


      for (
        let value = 1;
        value <= 5;
        value++
      ) {

        const label =
          document.createElement("label");


        const radio =
          document.createElement("input");

        radio.type =
          "radio";

        radio.name =
          `question-${index}`;

        radio.value =
          value;


        // 以前の回答を復元
        const imageName =
          images[currentIndex]?.name;


        if (
          imageName &&
          answers[imageName] &&
          answers[imageName][index] == value
        ) {

          radio.checked = true;

        }


        label.appendChild(radio);


        const span =
          document.createElement("span");

        span.textContent =
          value;


        label.appendChild(span);


        scale.appendChild(label);

      }


      questionDiv.appendChild(scale);

      questionsEl.appendChild(
        questionDiv
      );

    }
  );

}


// ===============================
// 現在の画像を表示
// ===============================

function renderCurrentImage() {

  const image =
    images[currentIndex];


  if (!image) {

    console.error(
      "画像がありません"
    );

    return;

  }


  console.log(
    "表示画像:",
    image.name
  );

  console.log(
    "画像URL:",
    image.url
  );


  // --------------------------------
  // 画像を表示
  // --------------------------------

  imageEl.src =
    image.url;


  imageEl.alt =
    "評価する服の画像";


  // --------------------------------
  // 画像名
  // --------------------------------

  imageNameEl.textContent =
    image.name;


  // --------------------------------
  // 進捗
  // --------------------------------

  progressEl.textContent =
    `${currentIndex + 1} / ${images.length} 枚目`;


  // --------------------------------
  // プログレスバー
  // --------------------------------

  const percentage =
    ((currentIndex + 1) / images.length) * 100;


  progressBarEl.style.width =
    `${percentage}%`;


  // --------------------------------
  // 質問表示
  // --------------------------------

  renderQuestions();

}


// ===============================
// 現在の回答を取得
// ===============================

function getCurrentAnswers() {

  const currentAnswers = [];


  for (
    let i = 0;
    i < QUESTIONS.length;
    i++
  ) {

    const selected =
      document.querySelector(
        `input[name="question-${i}"]:checked`
      );


    if (!selected) {

      return null;

    }


    currentAnswers.push(
      Number(selected.value)
    );

  }


  return currentAnswers;

}


// ===============================
// GASへ回答送信
// ===============================

async function sendAnswers(
  respondentId,
  imageName,
  scores
) {

  const data = {

    respondentId:
      respondentId,

    image:
      imageName,

    scores:
      scores

  };


  console.log(
    "送信データ:",
    data
  );


  await fetch(
    GAS_URL,
    {

      method: "POST",

      mode: "no-cors",

      headers: {

        "Content-Type":
          "text/plain;charset=utf-8"

      },

      body:
        JSON.stringify(data)

    }
  );

}


// ===============================
// 初期化
// ===============================

async function init() {

  try {

    console.log(
      "アンケートを開始します"
    );


    // --------------------------------
    // 画像を設定
    // --------------------------------

    createImages();


    console.log(
      "使用する画像:",
      images
    );


    // --------------------------------
    // 回答を復元
    // --------------------------------

    const savedAnswers =
      localStorage.getItem(
        ANSWERS_KEY
      );


    if (savedAnswers) {

      answers =
        JSON.parse(
          savedAnswers
        );

    } else {

      answers = {};

    }


    // --------------------------------
    // 現在の画像番号
    // --------------------------------

    const savedIndex =
      localStorage.getItem(
        INDEX_KEY
      );


    if (savedIndex !== null) {

      currentIndex =
        Number(savedIndex);

    } else {

      currentIndex = 0;

    }


    // 範囲外の場合
    if (
      currentIndex < 0 ||
      currentIndex >= images.length
    ) {

      currentIndex = 0;

    }


    // --------------------------------
    // 画像を表示
    // --------------------------------

    renderCurrentImage();


    // --------------------------------
    // アンケート表示
    // --------------------------------

    surveyEl.hidden =
      false;


    statusEl.hidden =
      true;


    // --------------------------------
    // 回答者ID取得
    // --------------------------------

    await getRespondentId();


    console.log(
      "初期化完了"
    );


  } catch (error) {

    console.error(
      "初期化エラー:",
      error
    );


    statusEl.textContent =
      "アンケートの読み込みに失敗しました。";


    alert(
      "アンケートの読み込みに失敗しました。\n\n" +
      error.message
    );

  }

}


// ===============================
// 回答フォーム送信
// ===============================

answerForm.addEventListener(
  "submit",
  async function (event) {

    // ページリロードを防ぐ
    event.preventDefault();


    // --------------------------------
    // 回答取得
    // --------------------------------

    const currentAnswers =
      getCurrentAnswers();


    if (!currentAnswers) {

      alert(
        "すべての項目に回答してください。"
      );

      return;

    }


    // --------------------------------
    // 現在の画像
    // --------------------------------

    const currentImage =
      images[currentIndex];


    // --------------------------------
    // 回答保存
    // --------------------------------

    answers[currentImage.name] =
      currentAnswers;


    localStorage.setItem(
      ANSWERS_KEY,
      JSON.stringify(answers)
    );


    // --------------------------------
    // ボタン無効化
    // --------------------------------

    submitBtn.disabled =
      true;


    const originalText =
      submitBtn.textContent;


    submitBtn.textContent =
      "送信中...";


    try {

      // --------------------------------
      // 回答者ID
      // --------------------------------

      const respondentId =
        localStorage.getItem(
          RESPONDENT_ID_KEY
        );


      // --------------------------------
      // GASへ送信
      // --------------------------------

      await sendAnswers(
        respondentId,
        currentImage.name,
        currentAnswers
      );


      // --------------------------------
      // 次の画像
      // --------------------------------

      currentIndex++;


      // --------------------------------
      // 5枚すべて終了
      // --------------------------------

      if (
        currentIndex >= images.length
      ) {

        localStorage.removeItem(
          ANSWERS_KEY
        );

        localStorage.removeItem(
          INDEX_KEY
        );


        surveyEl.hidden =
          true;


        completeEl.hidden =
          false;


        return;

      }


      // --------------------------------
      // 現在位置保存
      // --------------------------------

      localStorage.setItem(
        INDEX_KEY,
        currentIndex
      );


      // --------------------------------
      // 次の画像表示
      // --------------------------------

      renderCurrentImage();


    } catch (error) {

      console.error(
        "回答送信エラー:",
        error
      );


      alert(
        "回答の送信に失敗しました。\n\n" +
        "通信環境を確認してください。"
      );


    } finally {

      submitBtn.disabled =
        false;


      submitBtn.textContent =
        originalText;

    }

  }
);


// ===============================
// アンケート開始
// ===============================

init();
