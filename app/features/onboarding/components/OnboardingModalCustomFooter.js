// @flow

import React from 'react';
import InlineDialog from '@atlaskit/inline-dialog';
import Button from '@atlaskit/Button';
import { ModalFooter } from '@atlaskit/modal-dialog';
import styled from 'styled-components';

const StyledButton = styled(Button)`
    background: #3DBD86;
    color: white !important;
    border-radius: 4px;
`;

interface FooterState {
    isOpen: boolean;
}

/**
 * Onboarding Modal Footer.
 *
 *  @returns {ReactElement}
 */
class Footer extends React.Component<FooterComponentProps, FooterState> {
    state = { isOpen: false };

    // open = () => this.setState({ isOpen: true });

    // close = () => this.setState({ isOpen: false });

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        const { showKeyline } = this.props;
        const { isOpen } = this.state;

        return (
            <ModalFooter showKeyline = { showKeyline }>
                <InlineDialog
                    content = 'Some hint text?'
                    isOpen = { isOpen }
                    placement = 'top-start' />
                <StyledButton appearance = 'subtle'>
                    Close
                </StyledButton>
            </ModalFooter>
        );
    }
}

export default Footer;
