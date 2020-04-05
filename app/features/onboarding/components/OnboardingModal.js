// @flow
import styled from 'styled-components';
import { Modal } from '@atlaskit/onboarding';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import './OnBoardingStyle.css';

import OnboardingModalImage from '../../../images/onboarding.png';

import config from '../../config';

import { skipOnboarding, continueOnboarding } from '../actions';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;
};

const StyledModal = styled(Modal)`
`;

const subTitle = {
    display: 'block',
    fontSize: '14px',
    lineHeight: '20px',
    color: '#666666',
    marginBottom: '40px'
};
const description = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '18px',
    color: '#333333',
    marginBottom: '0px'
};

/**
 * Onboarding Modal Component.
 */
class OnboardingModal extends Component<Props, *> {
    /**
     * Initializes a new {@code OnboardingModal} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        // Bind event handlers.
        this._skip = this._skip.bind(this);
        this._next = this._next.bind(this);
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <StyledModal
                actions = { [
                    {
                        onClick: this._next,
                        text: 'Start Tour'
                    },
                    {
                        onClick: this._skip,
                        text: 'Skip'
                    }
                ] }
                heading = { `Welcome to ${config.appName}` }
                image = { OnboardingModalImage } >
                <p style = { subTitle }>Communiquez en toute securite et dans le respect de la vie privee</p>
                <p style = { description }>Let us show you around!</p>
            </StyledModal>
        );
    }

    _next: (*) => void;

    /**
     * Close the spotlight component.
     *
     * @returns {void}
     */
    _next() {
        this.props.dispatch(continueOnboarding());
    }

    _skip: (*) => void;

    /**
     * Skips all the onboardings.
     *
     * @returns {void}
     */
    _skip() {
        this.props.dispatch(skipOnboarding());
    }

}

export default connect()(OnboardingModal);
