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

import React from 'react';
import { shallow } from 'enzyme';
import { Welcome } from './welcome';
import { telemetryPluginMock } from '../../../../telemetry/public/mocks';

jest.mock('../opensearch_dashboards_services', () => ({
  getServices: () => ({
    addBasePath: (path: string) => `root${path}`,
    trackUiMetric: () => {},
  }),
}));
/*
test('should render a Welcome screen with the telemetry disclaimer', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});
*/
test('should render a Welcome screen with the telemetry disclaimer when optIn is true', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  telemetry.telemetryService.getIsOptedIn = jest.fn().mockReturnValue(true);
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with the telemetry disclaimer when optIn is false', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  telemetry.telemetryService.getIsOptedIn = jest.fn().mockReturnValue(false);
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(component).toMatchSnapshot();
});

test('should render a Welcome screen with no telemetry disclaimer', () => {
  const component = shallow(<Welcome urlBasePath="/" onSkip={() => {}} />);

  expect(component).toMatchSnapshot();
});

test('fires opt-in seen when mounted', () => {
  const telemetry = telemetryPluginMock.createStartContract();
  const mockSetOptedInNoticeSeen = jest.fn();
  telemetry.telemetryNotifications.setOptedInNoticeSeen = mockSetOptedInNoticeSeen;
  shallow(<Welcome urlBasePath="/" onSkip={() => {}} telemetry={telemetry} />);

  expect(mockSetOptedInNoticeSeen).toHaveBeenCalled();
});
