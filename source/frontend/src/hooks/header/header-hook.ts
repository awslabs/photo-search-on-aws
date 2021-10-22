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
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SelectProps } from '@awsui/components-react';
import { NonCancelableCustomEvent } from '@awsui/components-react/internal/events';

export type HeaderProps = {
  lang: SelectProps.Option;
  options: SelectProps.Option[];
  onLanguageChange: (event: NonCancelableCustomEvent<SelectProps.ChangeDetail>) => void;
};

const options = [
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
];

export const useHeader = (): HeaderProps => {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lang, setLang] = useState<SelectProps.Option>(options[0]);

  useEffect(() => {
    if (isLoading && i18n.language) {
      setIsLoading(false);
      setLang(options.filter((v) => v.value === i18n.language)[0] || options[0]);
    }
  }, [isLoading, i18n.language]);

  useEffect(() => {
    if (!isLoading) {
      i18n.changeLanguage(lang.value);
    }
  }, [isLoading, i18n, lang]);

  const onLanguageChange = ({ detail }: NonCancelableCustomEvent<SelectProps.ChangeDetail>): void => {
    const { selectedOption } = detail;
    setLang(selectedOption);
  };

  return {
    lang: isLoading ? options[0] : lang,
    options,
    onLanguageChange,
  };
};
