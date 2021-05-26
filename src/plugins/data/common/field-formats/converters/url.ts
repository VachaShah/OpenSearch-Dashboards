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
import { escape, memoize } from 'lodash';
import { getHighlightHtml } from '../utils';
import { OSD_FIELD_TYPES } from '../../osd-field-types/types';
import { FieldFormat } from '../field_format';
import {
  TextContextTypeConvert,
  HtmlContextTypeConvert,
  IFieldFormatMetaParams,
  FIELD_FORMAT_IDS,
} from '../types';

const templateMatchRE = /{{([\s\S]+?)}}/g;
const allowedUrlSchemes = ['http://', 'https://'];

const URL_TYPES = [
  {
    kind: 'a',
    text: i18n.translate('data.fieldFormats.url.types.link', {
      defaultMessage: 'Link',
    }),
  },
  {
    kind: 'img',
    text: i18n.translate('data.fieldFormats.url.types.img', {
      defaultMessage: 'Image',
    }),
  },
  {
    kind: 'audio',
    text: i18n.translate('data.fieldFormats.url.types.audio', {
      defaultMessage: 'Audio',
    }),
  },
];
const DEFAULT_URL_TYPE = 'a';

export class UrlFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.URL;
  static title = i18n.translate('data.fieldFormats.url.title', {
    defaultMessage: 'Url',
  });
  static fieldType = [
    OSD_FIELD_TYPES.NUMBER,
    OSD_FIELD_TYPES.BOOLEAN,
    OSD_FIELD_TYPES.DATE,
    OSD_FIELD_TYPES.IP,
    OSD_FIELD_TYPES.STRING,
    OSD_FIELD_TYPES.MURMUR3,
    OSD_FIELD_TYPES.UNKNOWN,
    OSD_FIELD_TYPES.CONFLICT,
  ];
  static urlTypes = URL_TYPES;

  constructor(params: IFieldFormatMetaParams) {
    super(params);
    this.compileTemplate = memoize(this.compileTemplate);
  }

  getParamDefaults() {
    return {
      type: DEFAULT_URL_TYPE,
      urlTemplate: null,
      labelTemplate: null,
      width: null,
      height: null,
    };
  }

  private formatLabel(value: string, url?: string): string {
    const template = this.param('labelTemplate');
    if (url == null) url = this.formatUrl(value);
    if (!template) return url;

    return this.compileTemplate(template)({
      value,
      url,
    });
  }

  private formatUrl(value: string): string {
    const template = this.param('urlTemplate');
    if (!template) return value;

    return this.compileTemplate(template)({
      value: encodeURIComponent(value),
      rawValue: value,
    });
  }

  private compileTemplate(template: string): Function {
    // trim all the odd bits, the variable names
    const parts = template.split(templateMatchRE).map((part, i) => (i % 2 ? part.trim() : part));

    return function (locals: Record<string, any>): string {
      // replace all the odd bits with their local var
      let output = '';
      let i = -1;
      while (++i < parts.length) {
        if (i % 2) {
          if (locals.hasOwnProperty(parts[i])) {
            const local = locals[parts[i]];
            output += local == null ? '' : local;
          }
        } else {
          output += parts[i];
        }
      }

      return output;
    };
  }

  private generateImgHtml(url: string, imageLabel: string): string {
    const isValidWidth = !isNaN(parseInt(this.param('width'), 10));
    const isValidHeight = !isNaN(parseInt(this.param('height'), 10));
    const maxWidth = isValidWidth ? `${this.param('width')}px` : 'none';
    const maxHeight = isValidHeight ? `${this.param('height')}px` : 'none';

    return `<img src="${url}" alt="${imageLabel}" style="width:auto; height:auto; max-width:${maxWidth}; max-height:${maxHeight};">`;
  }

  textConvert: TextContextTypeConvert = (value) => this.formatLabel(value);

  htmlConvert: HtmlContextTypeConvert = (rawValue, options = {}) => {
    const { field, hit } = options;
    const { parsedUrl } = this._params;
    const { basePath, pathname, origin } = parsedUrl || {};

    const url = escape(this.formatUrl(rawValue));
    const label = escape(this.formatLabel(rawValue, url));

    switch (this.param('type')) {
      case 'audio':
        return `<audio controls preload="none" src="${url}">`;

      case 'img':
        // If the URL hasn't been formatted to become a meaningful label then the best we can do
        // is tell screen readers where the image comes from.
        const imageLabel =
          label === url ? `A dynamically-specified image located at ${url}` : label;

        return this.generateImgHtml(url, imageLabel);
      default:
        const allowed = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
        if (!allowed && !parsedUrl) {
          return url;
        }

        let prefix = '';
        /**
         * This code attempts to convert a relative url into a OpenSearch Dashboards absolute url
         *
         * SUPPORTED:
         *  - /app/opensearch-dashboards/
         *  - ../app/opensearch-dashboards
         *  - #/discover
         *
         * UNSUPPORTED
         *  - app/opensearch-dashboards
         */
        if (!allowed) {
          // Handles urls like: `#/discover`
          if (url[0] === '#') {
            prefix = `${origin}${pathname}`;
          }
          // Handle urls like: `/app/opensearch-dashboards` or `/xyz/app/opensearch-dashboards`
          else if (url.indexOf(basePath || '/') === 0) {
            prefix = `${origin}`;
          }
          // Handle urls like: `../app/opensearch-dashboards`
          else {
            const prefixEnd = url[0] === '/' ? '' : '/';

            prefix = `${origin}${basePath || ''}/app${prefixEnd}`;
          }
        }

        let linkLabel;

        if (hit && hit.highlight && hit.highlight[field.name]) {
          linkLabel = getHighlightHtml(label, hit.highlight[field.name]);
        } else {
          linkLabel = label;
        }

        const linkTarget = this.param('openLinkInCurrentTab') ? '_self' : '_blank';

        return `<a href="${prefix}${url}" target="${linkTarget}" rel="noopener noreferrer">${linkLabel}</a>`;
    }
  };
}

// console.log(UrlFormat);
