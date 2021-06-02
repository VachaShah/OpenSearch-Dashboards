/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { i18n } from '@osd/i18n';
// @ts-ignore
import { bypassExternalUrlCheck } from '../vega_view/vega_base_view';
import { IServiceSettings, FileLayer } from '../../../maps-legacy/public';
import { Data, UrlObject, EmsQueryRequest } from './types';

/**
 * This class processes all Vega spec customizations,
 * converting url object parameters into query results.
 */
export class EmsFileParser {
  _serviceSettings: IServiceSettings;
  _fileLayersP?: Promise<FileLayer[]>;

  constructor(serviceSettings: IServiceSettings) {
    this._serviceSettings = serviceSettings;
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Update request object, expanding any context-aware keywords
   */
  parseUrl(obj: Data, url: UrlObject) {
    if (typeof url.name !== 'string') {
      throw new Error(
        i18n.translate('visTypeVega.emsFileParser.missingNameOfFileErrorMessage', {
          defaultMessage:
            '{dataUrlParam} with {dataUrlParamValue} requires {nameParam} parameter (name of the file)',
          values: {
            dataUrlParam: '"data.url"',
            dataUrlParamValue: '{"%type%": "emsfile"}',
            nameParam: '"name"',
          },
        })
      );
    }

    // Optimization: so initiate remote request as early as we know that we will need it
    if (!this._fileLayersP) {
      this._fileLayersP = this._serviceSettings.getFileLayers();
    }
    return { obj, name: url.name };
  }

  /**
   * Process items generated by parseUrl()
   * @param {object[]} requests each object is generated by parseUrl()
   * @returns {Promise<void>}
   */
  async populateData(requests: EmsQueryRequest[]) {
    if (requests.length === 0) return;

    const layers = await this._fileLayersP;

    for (const { obj, name } of requests) {
      const foundLayer = layers?.find((v) => v.name === name);
      if (!foundLayer) {
        throw new Error(
          i18n.translate('visTypeVega.emsFileParser.emsFileNameDoesNotExistErrorMessage', {
            defaultMessage: '{emsfile} {emsfileName} does not exist',
            values: { emsfileName: JSON.stringify(name), emsfile: 'emsfile' },
          })
        );
      }

      // This URL can bypass loader sanitization at the later stage
      const url = await this._serviceSettings.getUrlForRegionLayer(foundLayer);
      obj.url = bypassExternalUrlCheck(url);
    }
  }
}
