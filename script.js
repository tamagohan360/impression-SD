// ===============================
// 設定
// ===============================

// 1人あたりに使用する画像数
const IMAGE_COUNT = 5;

// Google Apps Script のURL
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyMXkdPLPzSqs8Y_hEbFne9bC-PPSmVhHuYzNNFhBk03kr4ORJR2uUt9G-0Tfb5ffhN1w/exec";

// GitHubのimagesフォルダ
const GITHUB_API =
  "https://api.github.com/repos/tamagohan360/impression-SD/contents/images";

// ===============================
// 使用する画像を指定
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
// localStorageのキー
// ===============================

const RESPONDENT_ID_KEY = "impressionSDRespondentId";
const ANSWERS_KEY = "impressionSDAnswers";
const INDEX_KEY = "impressionSDCurrentIndex";
const IMAGES_KEY = "impressionSDImages";


// ===============================
// 変数
// ===============================

let images = [];
let currentIndex = 0;
let answers = {};


// ===============================
// HTML要素
// ===============================

const imageEl = document.getElementById("currentImage");
const imageNameEl = document.getElementById("imageName");
const questionsEl = document.getElementById("questions");
const progressEl = document.getElementById("progress");
const submitBtn = document.getElementById("submitBtn");


// ===============================
// 回答者IDを取得
// ===============================

async function getRespondentId() {

  // すでにIDが保存されている場合
  const savedId =
    localStorage.getItem(RESPONDENT_ID_KEY);

  if (savedId) {
    return savedId;
  }

  try {

    const response =
      await fetch(GAS_URL);

    if (!response.ok) {
      throw new Error(
        "回答者IDの取得に失敗しました。"
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

  } catch (error) {

    console.error(
      "回答者ID取得エラー:",
      error
    );

    throw error;
  }
}


// ===============================
// GitHubから画像一覧を取得
// ===============================

async function getImages() {

  try {

    const response =
      await fetch(GITHUB_API);

    if (!response.ok) {

      throw new Error(
        "GitHubから画像一覧を取得できませんでした。"
      );

    }

    const data =
      await response.json();

    // 画像ファイルだけ取得
    return data.filter(item => {

      const name =
        item.name.toLowerCase();

      return (
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png") ||
        name.endsWith(".webp")
      );

    });

  } catch (error) {

    console.error(
      "画像取得エラー:",
      error
    );

    throw error;
  }
}


// ===============================
// 指定した5枚の画像を選択
// ===============================

function selectTargetImages(allImages) {

  // ファイル名をキーにして検索できるようにする
  const byName =
    new Map(
      allImages.map(
        item => [item.name, item]
      )
    );


  // 指定した画像だけ取得
  const selectedImages =
    TARGET_IMAGES
      .map(
        name => byName.get(name)
      )
      .filter(Boolean);


  // 指定画像がすべて存在するか確認
  if (
    selectedImages.length !==
    TARGET_IMAGES.length
  ) {

    const missingImages =
      TARGET_IMAGES.filter(
        name => !byName.has(name)
      );

    throw new Error(
      "指定した画像がGitHubのimagesフォルダに見つかりません。\n\n" +
      "見つからない画像:\n" +
      missingImages.join("\n")
    );
  }


  return selectedImages;
}


// ===============================
// 質問を表示
// ===============================

function renderQuestions() {

  questionsEl.innerHTML = "";


  QUESTIONS.forEach(
    (question, index) => {

      const questionDiv =
        document.createElement("div");

      questionDiv.className =
        "question";


      // 質問文
      const title =
        document.createElement("div");

      title.className =
        "question-title";

      title.textContent =
        `${index + 1}. ${question[0]} ― ${question[1]}`;

      questionDiv.appendChild(title);


      // 5段階評価
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


        // 以前回答していた場合は復元
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

  if (!images[currentIndex]) {
    return;
  }


  const image =
    images[currentIndex];


  // ★ GitHub APIから取得したURLをそのまま使用
  imageEl.src =
    image.download_url;


  // 画像名
  if (imageNameEl) {

    imageNameEl.textContent =
      image.name;

  }


  // 進捗
  if (progressEl) {

    progressEl.textContent =
      `${currentIndex + 1} / ${images.length}`;

  }


  // 質問を表示
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


    // 未回答
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
// Google Apps Scriptへ送信
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


  try {

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


    console.log(
      "回答を送信しました:",
      data
    );


  } catch (error) {

    console.error(
      "回答送信エラー:",
      error
    );

    throw error;
  }
}


// ===============================
// 初期化
// ===============================

async function init() {

  try {

    // 回答者ID取得
    await getRespondentId();


    // GitHubから画像一覧を取得
    const allImages =
      await getImages();


    // ★ 指定した5枚だけを使用
    images =
      selectTargetImages(
        allImages
      );


    // 使用画像をlocalStorageに保存
    localStorage.setItem(
      IMAGES_KEY,
      JSON.stringify(
        images.map(
          item => item.name
        )
      )
    );


    // 過去の回答を復元
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


    // 現在の画像番号を復元
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


    // 範囲外なら最初に戻す
    if (
      currentIndex < 0 ||
      currentIndex >= images.length
    ) {

      currentIndex = 0;

    }


    // 画像を表示
    renderCurrentImage();


  } catch (error) {

    console.error(
      "初期化エラー:",
      error
    );


    alert(
      "アンケートの初期化に失敗しました。\n\n" +
      error.message
    );

  }
}


// ===============================
// 次へボタン
// ===============================

submitBtn.addEventListener(
  "click",
  async function () {

    // 現在の回答を取得
    const currentAnswers =
      getCurrentAnswers();


    // 未回答がある場合
    if (!currentAnswers) {

      alert(
        "すべての項目に回答してください。"
      );

      return;
    }


    // 現在の画像
    const currentImage =
      images[currentIndex];


    // 回答を保存
    answers[currentImage.name] =
      currentAnswers;


    localStorage.setItem(
      ANSWERS_KEY,
      JSON.stringify(answers)
    );


    // ボタンを無効化
    submitBtn.disabled = true;


    const originalText =
      submitBtn.textContent;


    submitBtn.textContent =
      "送信中...";


    try {

      // 回答者ID
      const respondentId =
        localStorage.getItem(
          RESPONDENT_ID_KEY
        );


      // GASへ送信
      await sendAnswers(
        respondentId,
        currentImage.name,
        currentAnswers
      );


      // 次の画像へ
      currentIndex++;


      // ===============================
      // 全画像終了
      // ===============================

      if (
        currentIndex >= images.length
      ) {

        alert(
          "アンケートは以上で終了です。\n\n" +
          "ご協力ありがとうございました。"
        );


        // 次回のために回答情報を削除
        localStorage.removeItem(
          ANSWERS_KEY
        );

        localStorage.removeItem(
          INDEX_KEY
        );

        localStorage.removeItem(
          IMAGES_KEY
        );


        // 完了画面
        document.body.innerHTML = `
          <div style="
            max-width: 600px;
            margin: 80px auto;
            padding: 20px;
            text-align: center;
            font-family: sans-serif;
          ">
            <h2>アンケート終了</h2>

            <p>
              ご協力ありがとうございました。
            </p>
          </div>
        `;


        return;
      }


      // ===============================
      // 次の画像
      // ===============================

      localStorage.setItem(
        INDEX_KEY,
        currentIndex
      );


      renderCurrentImage();


    } catch (error) {

      console.error(
        "送信処理エラー:",
        error
      );


      alert(
        "回答の送信に失敗しました。\n\n" +
        "通信環境を確認して、もう一度お試しください。"
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
