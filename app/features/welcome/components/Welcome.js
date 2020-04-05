// @flow
import styled from 'styled-components';
import Button from '@atlaskit/button';
import { FieldTextStateless } from '@atlaskit/field-text';
import { SpotlightTarget } from '@atlaskit/onboarding';
import Page from '@atlaskit/page';
import { AtlasKitThemeProvider } from '@atlaskit/theme';

import React, { Component } from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import { Navbar } from '../../navbar';
import { Onboarding, startOnboarding } from '../../onboarding';
import { RecentList } from '../../recent-list';
import { createConferenceObjectFromURL } from '../../utils';

import { Body, Form, Header, Wrapper } from '../styled';
import { withTranslation } from 'react-i18next';
import i18n from '../../config/i18next.config';

const osLocale = require('os-locale');

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    /**
     * React Router location object.
     */
    location: Object;

    /**
     * Lang from previous session.
     */
    _persistentLang: string;

    t: any;
};

type State = {

    /**
     * URL of the room to join.
     * If this is not a url it will be treated as room name for default domain.
     */
    url: string;
};

// Thanks atlaskit for the random fucking !important on your button color prop.
const StyledButton = styled(Button)`
    background: #3DBD86;
    color: white !important;
    border-radius: 4px;
`;

const StyledHeader = styled(Header)`
    background: white;
    border-radius: 8px;
    padding:25px 15px;
    margin: 40px 12.5%;
`;

const mainBlock = {
    margin: '0 12.5%',
    padding: '30px 0 0 0',
    textAlign: 'center'
};
const mainTitle = {
    fontSize: '24px',
    lineHeight: '31px',
    color: '#333333'
};

/**
 * Welcome Component.
 */
class Welcome extends Component<Props, State> {
    /**
     * Initializes a new {@code Welcome} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        // Initialize url value in state if passed using location state object.
        let url = '';

        // Check and parse url if exists in location state.
        if (props.location.state) {
            const { room, serverURL } = props.location.state;

            if (room && serverURL) {
                url = `${serverURL}/${room}`;
            }
        }

        this.state = { url };

        // if (this.props._persistentLang) {
        //     i18n.changeLanguage(this.props._persistentLang);
        // } else {
        (async () => {
            const detected = await osLocale();

            console.log(detected);

            i18n.changeLanguage(detected.split('-')[0]);
        })();

        // }

        // Bind event handlers.
        this._onURLChange = this._onURLChange.bind(this);
        this._onFormSubmit = this._onFormSubmit.bind(this);
        this._onJoin = this._onJoin.bind(this);
    }

    /**
     * Start Onboarding once component is mounted.
     *
     * NOTE: It autonatically checks if the onboarding is shown or not.
     *
     * @returns {void}
     */
    componentDidMount() {
        this.props.dispatch(startOnboarding('welcome-page'));
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Page navigation = { <Navbar /> }>
                <AtlasKitThemeProvider mode = 'light'>
                    <Wrapper>
                        { this._renderHeader() }
                        { this._renderBody() }
                        <Onboarding section = 'welcome-page' />
                    </Wrapper>
                </AtlasKitThemeProvider>
            </Page>
        );
    }

    _onFormSubmit: (*) => void;

    /**
     * Prevents submission of the form and delegates the join logic.
     *
     * @param {Event} event - Event by which this function is called.
     * @returns {void}
     */
    _onFormSubmit(event: Event) {
        event.preventDefault();
        this._onJoin();
    }

    _onJoin: (*) => void;

    /**
     * Redirect and join conference.
     *
     * @returns {void}
     */
    _onJoin() {
        const inputURL = this.state.url;
        const conference = createConferenceObjectFromURL(inputURL);

        // Don't navigate if conference couldn't be created
        if (!conference) {
            return;
        }
        this.props.dispatch(push('/conference', conference));
    }

    _onURLChange: (*) => void;

    /**
     * Keeps URL input value and URL in state in sync.
     *
     * @param {SyntheticInputEvent<HTMLInputElement>} event - Event by which
     * this function is called.
     * @returns {void}
     */
    _onURLChange(event: SyntheticInputEvent<HTMLInputElement>) {
        this.setState({
            url: event.currentTarget.value
        });
    }

    /**
     * Renders the body for the welcome page.
     *
     * @returns {ReactElement}
     */
    _renderBody() {
        return (
            <Body>
                <RecentList />
            </Body>
        );
    }

    /**
     * Renders the header for the welcome page.
     *
     * @returns {ReactElement}
     */
    _renderHeader() {
        const locationState = this.props.location.state;
        const locationError = locationState && locationState.error;

        return (
            <div>
                <div style = { mainBlock }>
                    <h1 style = { mainTitle }>
                        { this.props.t('welcomepage.title') }
                    </h1>
                </div>
                <StyledHeader>
                    <SpotlightTarget name = 'conference-url'>
                        <Form onSubmit = { this._onFormSubmit }>
                            <FieldTextStateless
                                autoFocus = { true }
                                isInvalid = { locationError }
                                isLabelHidden = { true }
                                onChange = { this._onURLChange }
                                placeholder = { this.props.t('welcomepage.roomname') }
                                shouldFitContainer = { true }
                                type = 'text'
                                value = { this.state.url } />
                        </Form>
                    </SpotlightTarget>
                    <StyledButton
                        onClick = { this._onJoin }
                        type = 'button'>
                        { this.props.t('welcomepage.go') }
                    </StyledButton>
                </StyledHeader>
            </div>
        );
    }
}

/**
 * Maps (parts of) the redux state to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {{
 *     _persistentLang: string
 * }}
 */
function _mapStateToProps(state: Object) {
    return {
        _persistentLang: state.settings.lang
    };
}

export default withTranslation()(connect(_mapStateToProps)(Welcome));
