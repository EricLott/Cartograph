import React from 'react';
import DynamicIcon from '../components/common/DynamicIcon';

export const STANDARD_DECISIONS = {
    'infra_hosting': {
        options: [
            { id: 'azure', label: 'Azure', icon: <DynamicIcon name="vsc:azure" /> },
            { id: 'aws', label: 'AWS', icon: <DynamicIcon name="fa6-brands:aws" /> },
            { id: 'gcp', label: 'GCP', icon: <DynamicIcon name="si:googlecloud" /> },
            { id: 'hybrid', label: 'Hybrid', icon: <DynamicIcon name="vsc:hubot" /> },
            { id: 'onprem', label: 'On-Premise', icon: <DynamicIcon name="vsc:server" /> }
        ]
    },
    'infra_containerization': {
        options: [
            { id: 'docker', label: 'Docker', icon: <DynamicIcon name="si:docker" /> },
            { id: 'k8s', label: 'Kubernetes', icon: <DynamicIcon name="si:kubernetes" /> },
            { id: 'podman', label: 'Podman', icon: <DynamicIcon name="si:podman" /> },
            { id: 'none', label: 'None (Bare Metal/VM)', icon: <DynamicIcon name="vsc:circuit-board" /> }
        ]
    },
    'infra_iac': {
        options: [
            { id: 'terraform', label: 'Terraform', icon: <DynamicIcon name="si:terraform" /> },
            { id: 'bicep', label: 'Bicep/ARM', icon: <DynamicIcon name="gi:weight-lifting-up" /> },
            { id: 'pulumi', label: 'Pulumi', icon: <DynamicIcon name="si:pulumi" /> },
            { id: 'cdk', label: 'AWS CDK', icon: <DynamicIcon name="tb:file-lambda" /> },
            { id: 'manual', label: 'Manual/ClickOps', icon: <DynamicIcon name="fa6-regular:hand-pointer" /> }
        ]
    }
};

