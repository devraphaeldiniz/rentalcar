import { gql } from 'graphql-request'

export const GET_VEHICLES = gql`
  query GetVehicles($status: String) {
    vehicles(where: { status: { _eq: $status } }) {
      id
      brand
      model
      year
      plate
      category
      daily_rate
      status
      image_url
      features
      created_at
    }
  }
`

export const GET_VEHICLE = gql`
  query GetVehicle($id: uuid!) {
    vehicles_by_pk(id: $id) {
      id
      brand
      model
      year
      plate
      category
      daily_rate
      status
      image_url
      features
    }
  }
`

export const GET_USER_BOOKINGS = gql`
  query GetUserBookings($userId: uuid!) {
    bookings(where: { user_id: { _eq: $userId } }, order_by: { created_at: desc }) {
      id
      vehicle_id
      start_date
      end_date
      total_amount
      status
      payment_status
      created_at
    }
  }
`

export const GET_ALL_BOOKINGS = gql`
  query GetAllBookings {
    bookings(order_by: { created_at: desc }) {
      id
      user_id
      vehicle_id
      start_date
      end_date
      total_amount
      status
      payment_status
      notes
      created_at
    }
  }
`