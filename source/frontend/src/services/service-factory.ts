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
import { PhotoService } from './photo-service';
import { NameService } from './name-service';

export interface Service {
  readonly resource: string;
}

type ServiceNames = 'photos' | 'names';

type Services = {
  [key in ServiceNames]: Service;
};

export class ServiceFactory {
  private static services: Services = {
    photos: new PhotoService(),
    names: new NameService(),
  };

  public static getService(name: ServiceNames): Service {
    return this.services[name];
  }
}
