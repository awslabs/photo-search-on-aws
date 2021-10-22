/**
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// Imports
const fs = require("fs");
// Paths
const global_s3_assets = "../global-s3-assets";

function setParameter(template) {
  const parameters = template.Parameters ? template.Parameters : {};
  const assetParameters = Object.keys(parameters).filter(function (key) {
    return key.includes("BootstrapVersion");
  });
  assetParameters.forEach(function (a) {
    template.Parameters[a] = undefined;
  });
  const rules = template.Rules ? template.Rules : {};
  const rule = Object.keys(rules).filter(function (key) {
    return key.includes("CheckBootstrapVersion");
  });
  rule.forEach(function (a) {
    template.Rules[a] = undefined;
  });
}

function assetRef(s3BucketRef) {
  // Get the S3 bucket key references from assets file
  const raw_meta = fs.readFileSync(
    `${global_s3_assets}/photo-search-on-aws.assets.json`
  );
  let template = JSON.parse(raw_meta);
  const metadata = template.files[s3BucketRef]
    ? template.files[s3BucketRef]
    : {};
  return metadata.source.path.replace(".json", "");
}

// For each template in global_s3_assets ...
fs.readdirSync(global_s3_assets).forEach((file) => {
  if (file != "photo-search-on-aws.assets.json") {
    // Import and parse template file
    const raw_template = fs.readFileSync(`${global_s3_assets}/${file}`);
    let template = JSON.parse(raw_template);

    // Clean-up parameters section
    setParameter(template);

    const resources = template.Resources ? template.Resources : {};

    // Clean-up S3 bucket dependencies
    const replaceInfra = Object.keys(resources).filter(function (key) {
      return (
        resources[key].Type === "AWS::Lambda::Function" ||
        resources[key].Type === "AWS::CloudFormation::Stack"
      );
    });
    replaceInfra.forEach(function (f) {
      const fn = template.Resources[f];
      if (
        fn.Properties.hasOwnProperty("Code") &&
        fn.Properties.Code.hasOwnProperty("S3Bucket")
      ) {
        // Set Lambda::Function S3 bucket reference
        fn.Properties.Code.S3Key =
          `%%SOLUTION_NAME%%/%%VERSION%%/asset` + fn.Properties.Code.S3Key;
        fn.Properties.Code.S3Bucket = {
          "Fn::Sub": "%%BUCKET_NAME%%-${AWS::Region}",
        };
        // Set the handler
        const handler = fn.Properties.Handler;
        fn.Properties.Handler = `${handler}`;
      } else if (fn.Properties.hasOwnProperty("TemplateURL")) {
        // Set NestedStack S3 bucket reference
        var key = fn.Properties.TemplateURL["Fn::Join"][1][6]
          .replace(".json", "").replace("/", "");
        var assetPath = assetRef(key);        
        fn.Properties.TemplateURL = {
          "Fn::Join": [
            "",
            [
              "https://s3.",
              {
                Ref: "AWS::URLSuffix",
              },
              "/",
              `%%TEMPLATE_OUTPUT_BUCKET%%/%%SOLUTION_NAME%%/%%VERSION%%/${assetPath}`,
            ],
          ],
        };
      }
    });

    // Output modified template file
    const output_template = JSON.stringify(template, null, 2);
    fs.writeFileSync(`${global_s3_assets}/${file}`, output_template);
  }
});
