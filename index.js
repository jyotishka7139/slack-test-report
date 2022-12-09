const core = require("@actions/core");
const util = require("util");

try {
  const nameToGreet = core.getInput("who-to-greet");

  const dirnameString = __dirname;
  console.log("working directory: " + dirnameString);

  const rootDir = dirnameString.split("_actions")[0];
  console.log("root directory: " + rootDir);

  const outputDir = core.getInput("testOutputPath");
  const testDir = rootDir + outputDir;
  console.log("test directory: " + testDir);

  const slackToken = core.getInput("slackToken");
  const slackChannelId = core.getInput("slackChannelId");

  //Slack web hook init:
  const { WebClient } = require("@slack/web-api");
  const web = new WebClient(slackToken);

  //file system reader init:
  var fs = require("fs");

  //read file system and handle data:
  console.log("reading contents of test directory... ");
  fs.readdir(testDir, function (err, data) {
    //error handling or lack of it:
    if (err) throw err;
    //list files:
    console.log("Found files: ");
    console.log(data);

    let FINALSTR = "Hello " + nameToGreet + "!" + "\r\n\r\n";

    //remove this later
    // FINALSTR += parseData(data);
    // console.log(`final j string is ${FINALSTR}`);
    //remove

    let promise = new Promise(function (resolve, reject) {
      FINALSTR += parseData(data);
      resolve(FINALSTR);
    });

    promise.then(
      function (result) {
        slackBot(FINALSTR);
      },
      function (error) {
        slackBot("Parse failed");
      }
    );
  });

  const sortComponentsAndViews = (testcases) => {
    const sortedTestcases = testcases.sort((a, b) => {
      return a.attributes.name.localeCompare(b.attributes.name);
    });
    return sortedTestcases;
  };

  //function for parse every XML:
  function parseData(inData) {
    let testReport = "";
    inData.forEach(function (fileName) {
      // per file actions here, include only TEST files:
      // if (fileName.includes("test")) {
      //grab file and populate content to JS object:
      var convert = require("xml-js");
      var xml = require("fs").readFileSync(testDir + "/" + fileName, "utf8");
      var options = { ignoreComment: true, alwaysChildren: true };
      var content = convert.xml2js(xml, options); // or convert.xml2json(xml, options)
      const testcases = sortComponentsAndViews(content.elements[0].elements);

      console.log(util.inspect(content, false, null, true /* enable colors */));
      console.log("calculating test results, deciding if abbreviate output");
      if (
        parseInt(content.elements[0].attributes.failures) == 0 &&
        parseInt(content.elements[0].attributes.errors) == 0
      ) {
        console.log(
          "building ALL PASS report for " + content.elements[0].attributes.name
        );
        let reportContent =
          ":white_check_mark: " +
          "*" +
          content.elements[0].attributes.name +
          " ALL TESTS PASSED*" +
          "\r\n\r\n";
        reportContent += "\r\n" + "*COMPONENTS TEST CASES*" + "\r\n\r\n";
        reportContent += "*TEST SUITE   |   PASSED   |   TIME*" + "\r\n";
        // reportContent += "-------------- | ---------- | --------" + "\r\n";

        let reachedViewsTestcases = false;
        testcases.forEach((testSuite) => {
          if (
            testSuite.attributes.name.split("/")[2] == "views" &&
            !reachedViewsTestcases
          ) {
            reportContent += "\r\n" + "*VIEWS TEST CASES*" + "\r\n\r\n";
            reportContent += "*TEST SUITE   |   PASSED   |   TIME*" + "\r\n";
            // reportContent += "-------------- | ---------- | --------" + "\r\n";
            reachedViewsTestcases = true;
          }
          let testSuiteMessage;
          const testSuitePathElements =
            testSuite.attributes.name.split("/").length;
          const testSuiteElement = testSuite.attributes.name
            .split("/")
            [testSuitePathElements - 1].split(".")[0];
          testSuiteMessage =
            testSuiteElement +
            " and it’s child elements, states and click actions have passed all tests!";

          reportContent +=
            "*`" +
            testSuite.attributes.name +
            "`*" +
            "   |   " +
            testSuite.attributes.tests +
            " :white_check_mark:" +
            "   |   " +
            testSuite.attributes.time +
            "s" +
            "\r\n";

          reportContent += "> " + "_" + testSuiteMessage + "_" + "\r\n\r\n";

          // ------ contained tests of above test suite -------

          // let testDescription = null;
          // testSuite.elements.forEach((test) => {
          //   if (testDescription != test.attributes.classname) {
          //     testDescription = test.attributes.classname;
          //     reportContent += test.attributes.classname + "\r\n";
          //   }
          //   reportContent += " :white_check_mark: " + test.attributes.name + "\r\n";
          // });
          // reportContent += "\r\n\r\n";

          // ---------------------------------------------------
        });
        testReport += reportContent + "\r\n";
      } else {
        console.log(
          "building FAIL report for failed test: " +
            content.elements[0].attributes.name
        );
        let reportContent =
          ":x: " +
          content.elements[0].attributes.name +
          ": " +
          content.elements[0].attributes.failures +
          ` ${
            content.elements[0].attributes.failures == 1 ? "TEST" : "TESTS"
          } FAILED`;
        reportContent += "\r\n\r\n";

        //begin test case details
        testcases.forEach((testSuite) => {
          reportContent +=
            `${
              testSuite.attributes.failures != 0
                ? ":x: "
                : ":white_check_mark: "
            }` +
            testSuite.attributes.name +
            "\r\n\r\n";
          let testDescription = null;
          testSuite.elements.forEach((test) => {
            if (testDescription != test.attributes.classname) {
              testDescription = test.attributes.classname;
              reportContent += test.attributes.classname + "\r\n";
            }
            //pass
            if (!test.elements.length)
              reportContent +=
                " :white_check_mark: " + test.attributes.name + "\r\n";
            //fail
            else {
              reportContent +=
                " :x: " +
                test.attributes.name +
                "\r\n\r\n" +
                "-------------------" +
                "\r\n\r\n";
              reportContent += "ERROR: " + "\r\n";
              const errorMessage = test.elements[0].elements[0].text;
              reportContent += errorMessage.split("\n")[0] + "\r\n";
              reportContent += "\r\n\r\n" + "-------------------" + "\r\n\r\n";
            }
          });
          testReport += reportContent + "\r\n\r\n";
        });
        testReport += reportContent + "\r\n";
      }
    });
    return testReport;
  }

  //function for send text to slack:
  function slackBot(inString) {
    console.log("Sending to Slack: ");
    console.log(
      "==============================================================="
    );
    console.log(inString);
    console.log(
      "==============================================================="
    );
    (async () => {
      // See: https://api.slack.com/methods/chat.postMessage
      const res = await web.chat.postMessage({
        channel: slackChannelId,
        text: inString,
      });
      // `res` contains information about the posted message
      return "Message sent: ", res.ts;
    })();
  }
} catch (error) {
  core.setFailed("setFailed: " + error.message);
  console.log(error.message);
}
