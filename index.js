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

  //   const slackToken = core.getInput("slackToken");
  //   const slackChannelId = core.getInput("slackChannelId");

  //Slack web hook init:
  //   const { WebClient } = require("@slack/web-api");
  //   const web = new WebClient(slackToken);

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

    let FINALSTR = "Hello " + nameToGreet + "!" + "\r\n";

    //remove this later
    FINALSTR += parseData(data);
    console.log(`final j string is ${FINALSTR}`);
    //remove

    // let promise = new Promise(function (resolve, reject) {
    //   FINALSTR += parseData(data);
    //   resolve(FINALSTR);
    // });

    // promise.then(
    //   function (result) {
    //     slackBot(FINALSTR);
    //   },
    //   function (error) {
    //     slackBot("Parse failed");
    //   }
    // );
  });

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
      //process and output attributes:
      //if (short output stirng for passed test) else (long output string for failed test):
      console.log("content: ", content);
      console.log(util.inspect(content, false, null, true /* enable colors */));
      console.log("content attributes: ", content.elements[0].attributes);
      console.log("content elements FAIL: ", content.elements[0].elements);

      console.log("calculating test results, deciding if abbreviate output");
      if (
        parseInt(content.elements[0].attributes.failures) == 0 &&
        parseInt(content.elements[0].attributes.errors) == 0
      ) {
        console.log(
          "building abbreviated string for " +
            content.elements[0].attributes.name
        );
        let reportContent =
          "" + content.elements[0].attributes.name + " ALL TESTS PASSED:";
        reportContent += "\r\n\r\n";
        content.elements[0].elements.forEach((testSuite) => {
          reportContent +=
            ":white_check_mark: " + testSuite.attributes.name + "\r\n\r\n";
          let testDescription = null;
          testSuite.elements.forEach((test) => {
            if (testDescription != test.attributes.classname) {
              testDescription = test.attributes.classname;
              reportContent += test.attributes.classname + "\r\n";
            }
            reportContent +=
              " :white_check_mark: " + test.attributes.name + "\r\n";
          });
        });
        reportContent += "\r\n";
        testReport += reportContent;
      } else {
        console.log(
          "building long string for failed test: " +
            content.elements[0].attributes.name
        );
        let OUTPUTSTR = "";
        OUTPUTSTR += content.elements[0].attributes.name;
        OUTPUTSTR += " HAS ERRORS:";
        OUTPUTSTR += "\r\n";

        //begin test case details
        const testcases = content.elements[0].elements;
        testcases.forEach(function (item) {
          if (item.name == "testcase") {
            var testCaseNameResult = item.attributes.name;
            testCaseNameResult += getTestCaseResult(item);
            if (testCaseNameResult.includes("skipped")) {
              testCaseNameResult = ":pineapple: " + testCaseNameResult;
            } else if (testCaseNameResult.includes("failure")) {
              var errorMessage = item.elements[0].attributes.message;
              var shortMessage = errorMessage.split(/\r?\n/)[0];
              testCaseNameResult =
                ":apple: " + testCaseNameResult + " " + shortMessage;
            } else {
              testCaseNameResult = ":green_apple: " + testCaseNameResult;
            }
            testCaseNameResult = "    " + testCaseNameResult;
            testCaseNameResult += "\r\n";
            OUTPUTSTR += testCaseNameResult;
          }
        });
        testReport += OUTPUTSTR + "\r\n";
      }
    });
    return testReport;
  }

  //function for interpret xml test case:
  function getTestCaseResult(inXML) {
    var outStr = "";
    inXML.elements.forEach(function (result) {
      outStr += " ";
      outStr += result.name;
    });
    return outStr;
  }

  //function for send text to slack:
  //   function slackBot(inString) {
  //     console.log("Sending to Slack: ");
  //     console.log(
  //       "==============================================================="
  //     );
  //     console.log(inString);
  //     console.log(
  //       "==============================================================="
  //     );
  //     (async () => {
  //       // See: https://api.slack.com/methods/chat.postMessage
  //       const res = await web.chat.postMessage({
  //         channel: slackChannelId,
  //         text: inString,
  //       });
  //       // `res` contains information about the posted message
  //       return "Message sent: ", res.ts;
  //     })();
  //   }
} catch (error) {
  core.setFailed("setFailed: " + error.message);
  console.log(error.message);
}
