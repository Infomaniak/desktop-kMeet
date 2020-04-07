// @flow
import styled from 'styled-components';
import { Modal } from '@atlaskit/onboarding';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import './OnBoardingStyle.css';

import OnboardingModalImage from '../../../images/onboarding.png';

import { skipOnboarding, continueOnboarding } from '../actions';
import { withTranslation } from 'react-i18next';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    t: any;
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
                        text: this.props.t('onboarding.btnStart')
                    },
                    {
                        onClick: this._skip,
                        text: this.props.t('onboarding.btnSkip')
                    }
                ] }
                heading = { this.props.t('onboarding.welcome') }
                image = { OnboardingModalImage } >
                <p style = { subTitle }>{ this.props.t('onboarding.description') }</p>
                <p style = { description }>{ this.props.t('onboarding.callToAction') }</p>
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

export default withTranslation()(connect()(OnboardingModal));
