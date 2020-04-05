// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import {setLanguage} from '../actions';
import i18next from "../../config/i18next.config";
import {TogglesContainer} from "../styled";
import styled from "styled-components";
import {withTranslation} from "react-i18next";

const Select = styled.select`
  width: 100%;
  height: 35px;
  background: white;
  color: gray;
  padding-left: 5px;
  font-size: 14px;
  border: none;
  margin: 20px 0;

  option {
    color: black;
    background: white;
    display: flex;
    white-space: pre;
    min-height: 20px;
    padding: 0px 2px 1px;
  }
`;

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    /**
     * Default lang in (redux) store.
     */
    _language: string;

    t: any;
};

type State = {

     lang: string;
};

/**
 * Default Server URL field text placed in the Settings drawer.
 */
class LangField extends Component<Props, State> {
    /**
     * Initializes a new {@code ServerURLField} instance.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        this.state = {
            lang: i18next.language
        };

        this._onLangChange = this._onLangChange.bind(this);
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <TogglesContainer>
                <Select
                    onChange = { this._onLangChange }
                    value = { this.state.language }>
                    <option value = 'fr'>{ this.props.t('settingsView.French') }</option>
                    <option value = 'en'>{ this.props.t('settingsView.English') }</option>
                    <option value = 'de'>{ this.props.t('settingsView.Deutsch') }</option>
                    <option value = 'it'>{ this.props.t('settingsView.Italiano') }</option>
                    <option value = 'es'>{ this.props.t('settingsView.Spanish') }</option>
                </Select>
            </TogglesContainer>
        );
    }

    _onLangChange: (*) => void;

    /**
     * Change language.
     *
     * @returns {void}
     */
    _onLangChange() {
        const { lang } = this.state;

        this.props.dispatch(setLanguage(lang));

        i18next.changeLanguage(lang);
    }
}

/**
 * Maps (parts of) the redux store to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {{
 *     _serverURL: string
 * }}
 */
function _mapStateToProps(state: Object) {
    return {
        _lang: state.settings.lang
    };
}

export default withTranslation()(connect(_mapStateToProps)(LangField));
