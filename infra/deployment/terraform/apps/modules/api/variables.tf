variable "org_id" {
  type        = string
  description = " The numeric ID of the organization."
}

variable "all_users_ingress_tag_value_id" {
  type        = string
  description = "The allUsersIngress tag value ID."
}

variable "shared_vpc_network_name" {
  type        = string
  description = "The Shared VPC network name."
}

# TODO(Marcus): Learn more about subnetwork planning in shared VPC
variable "api_subnetwork_name" {
  type        = string
  description = "The name of the Shared VPC subnetwork in which the API and it's connected resources will be attached to."
}

variable "api_vpcaccess_connector_ip_cidr_range" {
  type        = string
  description = "The API VPC Access Connector IP CIDR range. See https://cloud.google.com/vpc/docs/serverless-vpc-access#ip_address_ranges."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "confidential_kms_crypto_key" {
  type        = string
  description = "The Confidential KMS crypto key."
}

variable "api_image" {
  type        = string
  description = "The name of the API Artifact Registry Docker image."
}

variable "api_sa_email" {
  type        = string
  description = "The email of the API service account."
}
