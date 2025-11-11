import { gql } from 'graphql-request'

export const GET_VEHICLE = gql`
  query GetVehicle($id: uuid!) {
    vehicles_by_pk(id: $id) {
      id
      brand
      model
      year
      daily_rate
      status
    }
  }
`

export const GET_VEHICLES = gql`
  query GetVehicles {
    vehicles(where: { status: { _eq: "available" } }) {
      id
      brand
      model
      year
      daily_rate
      image_url
      status
    }
  }
`
