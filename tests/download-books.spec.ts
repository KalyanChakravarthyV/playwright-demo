import { test, expect } from "@playwright/test";

const BOOKS = {};
const BASE_URL = process.env.PLAYWRIGHT_DEMO_URL


test("basic test", async ({ page }) => {


  await page.goto(BASE_URL + "/textbook.php");

  await page.locator('select[name="tclass"]');

  let classes = page.locator('select[name="tclass"] > option');

  for (let i = 0; i < (await classes.count()); i++) {
    let claz = await classes.nth(i).getAttribute("value");
    let clazName = await classes.nth(i).innerText();



    BOOKS[claz] = { name: clazName };
  }

  delete BOOKS["-1"];

  // [ ...Array(12) ].forEach((e, i) =>   delete BOOKS[++i] );



  for (const key in BOOKS) {
    await page.locator('select[name="tclass"]').selectOption(key);

    let subjects = page.locator('select[name="tsubject"] > option');

    let subCount = await subjects.count();

    BOOKS[key]["subjects"] = [];

    for (let i = 0; i < subCount; i++) {
      let subName = await subjects.nth(i).innerText();

      if (subName.trim().length == 0 || subName == "..Select Subject..")
        continue;

      BOOKS[key]["subjects"][subName] = {};

      await page.locator('select[name="tsubject"]').selectOption(subName);

      let books = await page.locator('select[name="tbook"] > option');
      let bookCount = await books.count();

      BOOKS[key]["subjects"][subName]["books"] = {};

      for (let i = 0; i < bookCount; i++) {
        let bookName = await books.nth(i).innerText();
        let bookURL = await books.nth(i).getAttribute("value");

        if (bookName.trim().length == 0 || bookName == "..Select Book Title..")
          continue;

        BOOKS[key]["subjects"][subName]["books"][bookName] = {
          class: BOOKS[key]["name"],
          url: BASE_URL + "/" + bookURL,
        };

      }
    }
  }

  for (const key in BOOKS) {
    for (const subjectName in BOOKS[key]["subjects"]) {
      for (const book in BOOKS[key]["subjects"][subjectName]["books"]) {

        await sleep(1000)

        await page.goto(
          BOOKS[key]["subjects"][subjectName]["books"][book]["url"]
        );

        BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"] = {};

        let chapters = page.locator(
          'td:has-text("Chapter ") >> td[align=left] >> span'
        );

        let chapterArray = [];
        let chapterCount = await chapters.count();

        for (let i = 0; i < chapterCount; i++) {
          let chapterName = await chapters.nth(i).innerText();
          chapterArray[i] = chapterName;
        }

        let chapterUrls = page.locator(
          'td:has-text("Chapter ") >> td[align=right] > a'
        );

        for (let i = 0; i < chapterCount; i++) {
          let chapterUrl = await chapterUrls.nth(i).getAttribute("href");

          BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"][
            chapterArray[i]
          ] = {};

          BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"][
            chapterArray[i]
          ]["url"] = BASE_URL + "/" + chapterUrl;

          let chapCode = chapterUrl.substring(
            chapterUrl.indexOf("?") + 1,
            chapterUrl.indexOf("=")
          );
          let chapNum = chapterUrl.substring(
            chapterUrl.indexOf("=") + 1,
            chapterUrl.indexOf("-")
          );
          chapNum = parseInt(chapNum) < 10 ? "0" + chapNum : chapNum;

          if (chapCode == "" || chapNum == "")
            BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"][
              chapterArray[i]
            ]["pdfUrl"] =
              BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"][
                chapterArray[i]
              ]["url"];
          else {
            BOOKS[key]["subjects"][subjectName]["books"][book]["chapters"][
              chapterArray[i]
            ]["pdfUrl"] =
              BASE_URL + "/textbook/pdf/" + chapCode + chapNum + ".pdf";
          }
        }
      }
    }
  }

  console.log("Writing to database")

  const collection = await getDBCollection()



    for (const key in BOOKS) {
      for (const subjectName in BOOKS[key]["subjects"]) {

        let books = BOOKS[key]["subjects"][subjectName]["books"]

        for (const bookName in books) {
          
          let bookURL = books[bookName]["url"]
          

          let chapters = books[bookName]["chapters"]

          for(const chapter in chapters){
            let record = {"classNum": key,"class": BOOKS[key].name, "bookUrl":bookURL, "bookTitle":bookName,
            "subjectName": subjectName, "chapter" : chapter, 
            "url": chapters[chapter].url, "pdfUrl" : chapters[chapter].pdfUrl , "createdDate" : new Date()}

            console.log(JSON.stringify(record))

            await collection.insertOne(record);

          }
        }
      }
    }

    

  console.log("Finished");

});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getDBCollection() {

  const { MongoClient, ServerApiVersion } = require('mongodb');
  const uri = process.env.MONGO_URL
  const client =  new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 ,
    connectTimeoutMS: 50000,
    serverSelectionTimeoutMS: 50000
  });

  const db = await MongoClient.connect(uri);
  const dbo = db.db("ncert");
  const result = await dbo.collection("booksMetadata")
  return result;
}