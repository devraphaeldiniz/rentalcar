import { gql } from 'graphql-request'

export const INSERT_VEHICLE = gql`
  mutation InsertVehicle($object: vehicles_insert_input!) {
    insert_vehicles_one(object: $object) {
      id
      brand
      model
      year
    }
  }
`

export const UPDATE_VEHICLE = gql`
  mutation UpdateVehicle($id: uuid!, $set: vehicles_set_input!) {
    update_vehicles_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`

export const DELETE_VEHICLE = gql`
  mutation DeleteVehicle($id: uuid!) {
    delete_vehicles_by_pk(id: $id) {
      id
    }
  }
`

export const INSERT_BOOKING = gql`
  mutation InsertBooking($object: bookings_insert_input!) {
    insert_bookings_one(object: $object) {
      id
      total_amount
      status
    }
  }
`

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($id: uuid!, $status: String!) {
    update_bookings_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
      id
      status
    }
  }
`