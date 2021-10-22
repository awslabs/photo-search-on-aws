/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { OnEventRequest, OnEventResponse } from '@aws-cdk/custom-resources/lib/provider-framework/types';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import * as AWS from 'aws-sdk';

export const handler = async (event: OnEventRequest): Promise<OnEventResponse> => {
  console.log('event: ', event);

  switch (event.RequestType) {
    case 'Create': 
    case 'Update':
      await createRekognitionCollection(event);
      await createAesMapping(event);
      return {};
    case 'Delete':
      return {};
  }
};

const createAesMapping = async (event: OnEventRequest) => {
  {
    const aesClient = new ElasticSearchClient({
      node: `https://${event.ResourceProperties['AesNodeEndpoint']}`,
    });

    return aesClient.indices
      .create(
        {
          index: event.ResourceProperties['AesIndexName'],
          body: {
            settings: {
              analysis: {
                tokenizer: {
                  my_tokenizer: {
                    type: 'ngram',
                    min_gram: 1,
                    max_gram: 2,
                  },
                },
                analyzer: {
                  my_analyzer: {
                    tokenizer: 'my_tokenizer',
                  },
                },
              },
            },
            mappings: {
              properties: {
                rekognition_id: {
                  type: 'keyword',
                },
                search_target: {
                  type: 'boolean',
                },
                image_location: {
                  type: 'keyword',
                },
                name: {
                  type: 'text',
                  analyzer: 'my_analyzer',
                },
                tags: {
                  type: 'keyword',
                },
              },
            },
          },
        },
        { ignore: [400] }
      )
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

const createRekognitionCollection = async (event: OnEventRequest) => {
  {
    const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;
    const rekognition = new AWS.Rekognition(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});
    return rekognition.createCollection(
      {
        CollectionId: event.ResourceProperties['RekognitionCollectionId'],
      },
      (err, data) => {
        if (err) console.log(err, err.stack);
        // an error occurred
        else console.log(data);
      }
    );
  }
};
