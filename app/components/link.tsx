import * as Headless from '@headlessui/react'
import {NavLink, type NavLinkProps} from 'react-router'
import React, { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  props: NavLinkProps & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  return (
    <Headless.DataInteractive>
      <NavLink {...props} ref={ref} />
    </Headless.DataInteractive>
  )
})
